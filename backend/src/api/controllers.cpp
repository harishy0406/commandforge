#include "commandforge/api/controllers.hpp"
#include "commandforge/common/logger.hpp"
#include "commandforge/ai/mock_provider.hpp"
#include "commandforge/ai/openai_provider.hpp"
#include <chrono>
#include <iomanip>
#include <sstream>

namespace commandforge {

ApiController::ApiController(ServerConfig config,
                             std::shared_ptr<IHistoryRepository> repository,
                             std::shared_ptr<IAIProvider> ai_provider,
                             std::shared_ptr<RiskAnalyzer> risk_analyzer,
                             std::shared_ptr<ExecutionEngine> execution_engine,
                             std::shared_ptr<SystemMonitor> system_monitor)
    : config_(std::move(config)),
      repository_(std::move(repository)),
      ai_provider_(std::move(ai_provider)),
      risk_analyzer_(std::move(risk_analyzer)),
      execution_engine_(std::move(execution_engine)),
      system_monitor_(std::move(system_monitor)) {}

static std::string isoTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::tm buf;
#if defined(_WIN32) || defined(_WIN64)
    localtime_s(&buf, &in_time_t);
#else
    localtime_r(&in_time_t, &buf);
#endif
    std::ostringstream ss;
    ss << std::put_time(&buf, "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

nlohmann::json ApiController::handleHealth() {
    return {
        {"status", "healthy"},
        {"timestamp", isoTimestamp()},
        {"version", "1.0.0"},
        {"execution_adapter", config_.execution_adapter},
        {"docker_available", execution_engine_ ? execution_engine_->isDockerAvailable() : false},
        {"ai_provider", config_.ai_provider},
        {"ai_model", config_.ai_model},
        {"has_ai_api_key", !config_.ai_api_key.empty()}
    };
}

nlohmann::json ApiController::handleDashboardSummary() {
    DashboardSummary summary;
    if (repository_) {
        summary = repository_->getSummary();
    }
    if (system_monitor_) {
        SystemMetrics m = system_monitor_->getMetrics();
        summary.cpu_usage_pct = m.cpu_usage_pct;
        summary.memory_usage_pct = m.memory_usage_pct;
    }
    return summary.toJson();
}

nlohmann::json ApiController::handleGetAIProviders() {
    auto presets = getAIProviderPresets();
    nlohmann::json arr = nlohmann::json::array();
    for (const auto& p : presets) {
        arr.push_back(p.toJson());
    }
    return {
        {"active_provider", config_.ai_provider},
        {"active_model", config_.ai_model},
        {"active_api_url", config_.ai_api_url},
        {"has_active_api_key", !config_.ai_api_key.empty()},
        {"providers", arr}
    };
}

void ApiController::reconfigureAIProvider() {
    if (config_.ai_provider == "mock") {
        LOG_INFO("ApiController", "Switching active AI provider to Mock / Offline heuristics engine.");
        ai_provider_ = std::make_shared<MockProvider>();
    } else {
        LOG_INFO("ApiController", "Switching active AI provider to " + config_.ai_provider +
                 " (model: " + config_.ai_model + ", endpoint: " + config_.ai_api_url + ")");
        ai_provider_ = std::make_shared<OpenAIProvider>(config_.ai_api_key, config_.ai_api_url, config_.ai_model);
    }
}

nlohmann::json ApiController::handleGenerateCommand(const nlohmann::json& requestBody) {
    if (!requestBody.contains("prompt") || !requestBody["prompt"].is_string()) {
        return {{"error", "Field 'prompt' is required and must be a string."}};
    }

    std::string prompt = requestBody["prompt"].get<std::string>();
    std::string context = requestBody.value("context", "");

    if (prompt.empty()) {
        return {{"error", "Prompt cannot be empty."}};
    }

    GeneratedCommand cmd = ai_provider_->generateCommand(prompt, context);
    nlohmann::json res = cmd.toJson();
    res["provider"] = config_.ai_provider;
    res["model"] = config_.ai_model;
    return res;
}

nlohmann::json ApiController::handleValidateCommand(const nlohmann::json& requestBody) {
    if (!requestBody.contains("command") || !requestBody["command"].is_string()) {
        return {{"error", "Field 'command' is required and must be a string."}};
    }

    std::string command = requestBody["command"].get<std::string>();
    ValidationResult val = risk_analyzer_->validate(command);
    return val.toJson();
}

nlohmann::json ApiController::handleExecuteCommand(const nlohmann::json& requestBody) {
    if (!requestBody.contains("command") || !requestBody["command"].is_string()) {
        return {{"error", "Field 'command' is required and must be a string."}};
    }

    ExecutionRequest req;
    req.id = requestBody.value("id", "");
    req.command = requestBody["command"].get<std::string>();
    req.prompt = requestBody.value("prompt", "");
    req.risk_level = stringToRiskLevel(requestBody.value("risk_level", "low"));
    req.user_approved = requestBody.value("user_approved", false);
    req.timeout_seconds = requestBody.value("timeout_seconds", config_.execution_timeout_seconds);

    ExecutionResult result = execution_engine_->execute(req);
    return result.toJson();
}

nlohmann::json ApiController::handleGetHistory(int page, int limit, const std::string& status, const std::string& search) {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    int total = 0;
    std::vector<CommandRecord> records;
    if (repository_) {
        records = repository_->getHistory(page, limit, status, search, total);
    }

    nlohmann::json recordsJson = nlohmann::json::array();
    for (const auto& r : records) {
        recordsJson.push_back(r.toJson());
    }

    return {
        {"records", recordsJson},
        {"total", total},
        {"page", page},
        {"limit", limit}
    };
}

nlohmann::json ApiController::handleGetHistoryById(const std::string& id) {
    if (repository_) {
        auto item = repository_->getById(id);
        if (item) {
            return item->toJson();
        }
    }
    return {{"error", "Record not found with ID: " + id}};
}

nlohmann::json ApiController::handleCancelExecution(const std::string& id) {
    bool cancelled = execution_engine_->cancelExecution(id);
    return {
        {"id", id},
        {"status", cancelled ? "cancelled" : "not_found_or_finished"}
    };
}

nlohmann::json ApiController::handleGetSystemMetrics() {
    if (system_monitor_) {
        return system_monitor_->getMetrics().toJson();
    }
    return {{"error", "System monitor is not active"}};
}

nlohmann::json ApiController::handleGetSettings() {
    return config_.toPublicJson();
}

nlohmann::json ApiController::handleUpdateSettings(const nlohmann::json& requestBody) {
    bool aiChanged = false;

    if (requestBody.contains("ai_provider") && requestBody["ai_provider"].is_string()) {
        std::string newProvider = requestBody["ai_provider"].get<std::string>();
        if (newProvider != config_.ai_provider) {
            config_.ai_provider = newProvider;
            aiChanged = true;
        }
    }
    if (requestBody.contains("ai_model") && requestBody["ai_model"].is_string()) {
        std::string newModel = requestBody["ai_model"].get<std::string>();
        if (newModel != config_.ai_model) {
            config_.ai_model = newModel;
            aiChanged = true;
        }
    }
    if (requestBody.contains("ai_api_url") && requestBody["ai_api_url"].is_string()) {
        std::string newUrl = requestBody["ai_api_url"].get<std::string>();
        if (newUrl != config_.ai_api_url) {
            config_.ai_api_url = newUrl;
            aiChanged = true;
        }
    }
    if (requestBody.contains("ai_api_key") && requestBody["ai_api_key"].is_string()) {
        std::string newKey = requestBody["ai_api_key"].get<std::string>();
        config_.ai_api_key = newKey;
        aiChanged = true;
    }

    if (aiChanged) {
        reconfigureAIProvider();
    }

    if (requestBody.contains("execution_timeout_seconds")) {
        if (!requestBody["execution_timeout_seconds"].is_number_integer()) {
            return {{"error", "execution_timeout_seconds must be an integer"}};
        }
        int val = requestBody["execution_timeout_seconds"].get<int>();
        if (val < 1 || val > 300) {
            return {{"error", "execution_timeout_seconds must be between 1 and 300 seconds"}};
        }
        config_.execution_timeout_seconds = val;
    }
    if (requestBody.contains("max_output_bytes")) {
        if (!requestBody["max_output_bytes"].is_number_integer()) {
            return {{"error", "max_output_bytes must be an integer"}};
        }
        int val = requestBody["max_output_bytes"].get<int>();
        if (val < 1024 || val > 10485760) {
            return {{"error", "max_output_bytes must be between 1024 and 10485760 bytes (10MB)"}};
        }
        config_.max_output_bytes = val;
    }
    if (requestBody.contains("history_retention_days")) {
        if (!requestBody["history_retention_days"].is_number_integer()) {
            return {{"error", "history_retention_days must be an integer"}};
        }
        int val = requestBody["history_retention_days"].get<int>();
        if (val < 1 || val > 365) {
            return {{"error", "history_retention_days must be between 1 and 365 days"}};
        }
        config_.history_retention_days = val;
    }
    if (requestBody.contains("monitoring_interval_ms")) {
        if (!requestBody["monitoring_interval_ms"].is_number_integer()) {
            return {{"error", "monitoring_interval_ms must be an integer"}};
        }
        int val = requestBody["monitoring_interval_ms"].get<int>();
        if (val < 500 || val > 60000) {
            return {{"error", "monitoring_interval_ms must be between 500 and 60000 ms"}};
        }
        config_.monitoring_interval_ms = val;
    }
    return config_.toPublicJson();
}

} // namespace commandforge
