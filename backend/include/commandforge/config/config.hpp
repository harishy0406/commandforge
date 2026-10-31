#pragma once

#include <string>
#include <vector>
#include <cstdlib>
#include <nlohmann/json.hpp>

namespace commandforge {

struct AIProviderPreset {
    std::string id;
    std::string name;
    std::string default_url;
    std::string default_model;
    std::vector<std::string> recommended_models;
    bool requires_api_key;
    std::string description;
    std::string key_hint;

    nlohmann::json toJson() const {
        return {
            {"id", id},
            {"name", name},
            {"default_url", default_url},
            {"default_model", default_model},
            {"recommended_models", recommended_models},
            {"requires_api_key", requires_api_key},
            {"description", description},
            {"key_hint", key_hint}
        };
    }
};

std::vector<AIProviderPreset> getAIProviderPresets();

struct ServerConfig {
    std::string host{"0.0.0.0"};
    int port{8080};
    std::string db_path{"commandforge.db"};
    std::string log_level{"info"};

    std::string ai_provider{"mock"};
    std::string ai_api_key{""};
    std::string ai_api_url{"https://api.openai.com/v1/chat/completions"};
    std::string ai_model{"gpt-4o-mini"};

    std::string execution_adapter{"docker"};
    std::string docker_image{"commandforge-sandbox:latest"};
    int execution_timeout_seconds{10};
    int max_output_bytes{65536};
    bool isolation_network_enabled{false};
    std::string workspace_dir{"/tmp/commandforge_sandbox"};
    int history_retention_days{30};
    int monitoring_interval_ms{3000};

    static ServerConfig loadFromEnv();

    nlohmann::json toPublicJson() const {
        std::string maskedKey = "";
        if (!ai_api_key.empty()) {
            if (ai_api_key.length() > 8) {
                maskedKey = ai_api_key.substr(0, 4) + "..." + ai_api_key.substr(ai_api_key.length() - 4);
            } else {
                maskedKey = "••••••••";
            }
        }

        return {
            {"host", host},
            {"port", port},
            {"ai_provider", ai_provider},
            {"ai_model", ai_model},
            {"ai_api_url", ai_api_url},
            {"has_ai_api_key", !ai_api_key.empty()},
            {"ai_api_key_masked", maskedKey},
            {"execution_adapter", execution_adapter},
            {"docker_image", docker_image},
            {"execution_timeout_seconds", execution_timeout_seconds},
            {"max_output_bytes", max_output_bytes},
            {"isolation_network_enabled", isolation_network_enabled},
            {"history_retention_days", history_retention_days},
            {"monitoring_interval_ms", monitoring_interval_ms}
        };
    }
};

} // namespace commandforge
