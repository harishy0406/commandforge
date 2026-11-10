#include "commandforge/api/http_server.hpp"
#include "commandforge/common/logger.hpp"
#include <nlohmann/json.hpp>

namespace commandforge {

static int parseQueryInt(const httplib::Request& req,
                         const char* name,
                         int defaultValue,
                         int minValue,
                         int maxValue) {
    if (!req.has_param(name)) return defaultValue;
    try {
        const std::string raw = req.get_param_value(name);
        size_t pos = 0;
        int parsed = std::stoi(raw, &pos);
        if (pos != raw.size()) return defaultValue;
        if (parsed < minValue) return minValue;
        if (parsed > maxValue) return maxValue;
        return parsed;
    } catch (...) {
        return defaultValue;
    }
}

HttpServer::HttpServer(std::string host, int port, std::shared_ptr<ApiController> controller)
    : host_(std::move(host)),
      port_(port),
      controller_(std::move(controller)) {
    setupCors();
    setupRoutes();
}

HttpServer::~HttpServer() {
    stop();
}

void HttpServer::setupCors() {
    server_.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
        if (req.method == "OPTIONS") {
            res.status = 204;
            return httplib::Server::HandlerResponse::Handled;
        }
        return httplib::Server::HandlerResponse::Unhandled;
    });

    server_.set_error_handler([](const httplib::Request&, httplib::Response& res) {
        if (res.status == 404 && res.body.empty()) {
            res.set_content(R"({"error":"Endpoint not found"})", "application/json");
        }
    });
}

static void sendJson(httplib::Response& res, const nlohmann::json& j, int status = 200) {
    res.status = status;
    res.set_content(j.dump(2), "application/json");
}

void HttpServer::setupRoutes() {
    // GET /api/health
    server_.Get("/api/health", [this](const httplib::Request&, httplib::Response& res) {
        sendJson(res, controller_->handleHealth());
    });

    // GET /api/dashboard/summary
    server_.Get("/api/dashboard/summary", [this](const httplib::Request&, httplib::Response& res) {
        sendJson(res, controller_->handleDashboardSummary());
    });

    // GET /api/ai/providers
    server_.Get("/api/ai/providers", [this](const httplib::Request&, httplib::Response& res) {
        sendJson(res, controller_->handleGetAIProviders());
    });

    // POST /api/commands/generate
    server_.Post("/api/commands/generate", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = nlohmann::json::parse(req.body);
            auto response = controller_->handleGenerateCommand(body);
            int status = response.contains("error") ? 400 : 200;
            sendJson(res, response, status);
        } catch (const std::exception& e) {
            sendJson(res, {{"error", std::string("Invalid JSON: ") + e.what()}}, 400);
        }
    });

    // POST /api/commands/validate
    server_.Post("/api/commands/validate", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = nlohmann::json::parse(req.body);
            auto response = controller_->handleValidateCommand(body);
            int status = response.contains("error") ? 400 : 200;
            sendJson(res, response, status);
        } catch (const std::exception& e) {
            sendJson(res, {{"error", std::string("Invalid JSON: ") + e.what()}}, 400);
        }
    });

    // POST /api/commands/validate/batch
    server_.Post("/api/commands/validate/batch", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = nlohmann::json::parse(req.body);
            auto response = controller_->handleValidateBatchCommand(body);
            int status = response.contains("error") ? 400 : 200;
            sendJson(res, response, status);
        } catch (const std::exception& e) {
            sendJson(res, {{"error", std::string("Invalid JSON: ") + e.what()}}, 400);
        }
    });

    // POST /api/commands/execute
    server_.Post("/api/commands/execute", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = nlohmann::json::parse(req.body);
            auto response = controller_->handleExecuteCommand(body);
            int status = response.contains("error") ? 400 : 200;
            sendJson(res, response, status);
        } catch (const std::exception& e) {
            sendJson(res, {{"error", std::string("Invalid JSON: ") + e.what()}}, 400);
        }
    });

    // GET /api/commands/history
    server_.Get("/api/commands/history", [this](const httplib::Request& req, httplib::Response& res) {
        int page = parseQueryInt(req, "page", 1, 1, 100000);
        int limit = parseQueryInt(req, "limit", 20, 1, 100);
        std::string status = req.has_param("status") ? req.get_param_value("status") : "";
        std::string search = req.has_param("search") ? req.get_param_value("search") : "";
        sendJson(res, controller_->handleGetHistory(page, limit, status, search));
    });

    // GET /api/commands/history/export
    server_.Get("/api/commands/history/export", [this](const httplib::Request& req, httplib::Response& res) {
        std::string format = req.has_param("format") ? req.get_param_value("format") : "csv";
        std::string status = req.has_param("status") ? req.get_param_value("status") : "";
        std::string search = req.has_param("search") ? req.get_param_value("search") : "";
        if (format == "json") {
            res.set_header("Content-Disposition", "attachment; filename=\"commandforge-audit-log.json\"");
            res.set_content(controller_->handleExportHistory("json", status, search), "application/json");
        } else {
            res.set_header("Content-Disposition", "attachment; filename=\"commandforge-audit-log.csv\"");
            res.set_content(controller_->handleExportHistory("csv", status, search), "text/csv");
        }
        res.status = 200;
    });

    // GET /api/commands/history/:id
    server_.Get(R"(/api/commands/history/([a-zA-Z0-9\-]+))", [this](const httplib::Request& req, httplib::Response& res) {
        std::string id = req.matches[1];
        auto response = controller_->handleGetHistoryById(id);
        int status = response.contains("error") ? 404 : 200;
        sendJson(res, response, status);
    });

    // POST /api/commands/execute/:id/cancel
    server_.Post(R"(/api/commands/execute/([a-zA-Z0-9\-]+)/cancel)", [this](const httplib::Request& req, httplib::Response& res) {
        std::string id = req.matches[1];
        sendJson(res, controller_->handleCancelExecution(id));
    });

    // DELETE /api/commands/history
    server_.Delete("/api/commands/history", [this](const httplib::Request& req, httplib::Response& res) {
        int olderThan = parseQueryInt(req, "older_than_days", 0, 0, 36500);
        sendJson(res, controller_->handlePurgeHistory(olderThan));
    });

    // POST /api/commands/history/purge
    server_.Post("/api/commands/history/purge", [this](const httplib::Request& req, httplib::Response& res) {
        int olderThan = 0;
        if (!req.body.empty()) {
            try {
                auto body = nlohmann::json::parse(req.body);
                if (body.contains("older_than_days") && body["older_than_days"].is_number_integer()) {
                    olderThan = body["older_than_days"].get<int>();
                }
            } catch (...) {}
        }
        if (req.has_param("older_than_days")) {
            olderThan = parseQueryInt(req, "older_than_days", olderThan, 0, 36500);
        }
        sendJson(res, controller_->handlePurgeHistory(olderThan));
    });

    // GET /api/system/metrics
    server_.Get("/api/system/metrics", [this](const httplib::Request&, httplib::Response& res) {
        auto response = controller_->handleGetSystemMetrics();
        int status = response.contains("error") ? 503 : 200;
        sendJson(res, response, status);
    });

    // GET /api/system/diagnostics
    server_.Get("/api/system/diagnostics", [this](const httplib::Request&, httplib::Response& res) {
        auto response = controller_->handleGetSystemDiagnostics();
        int status = response.contains("error") ? 503 : 200;
        sendJson(res, response, status);
    });

    // GET /api/settings
    server_.Get("/api/settings", [this](const httplib::Request&, httplib::Response& res) {
        sendJson(res, controller_->handleGetSettings());
    });

    // PUT /api/settings
    server_.Put("/api/settings", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = nlohmann::json::parse(req.body);
            auto response = controller_->handleUpdateSettings(body);
            int status = response.contains("error") ? 400 : 200;
            sendJson(res, response, status);
        } catch (const std::exception& e) {
            sendJson(res, {{"error", std::string("Invalid JSON: ") + e.what()}}, 400);
        }
    });
}

bool HttpServer::start() {
    is_running_ = true;
    LOG_INFO("HttpServer", "Starting CommandForge HTTP REST server on " + host_ + ":" + std::to_string(port_));
    return server_.listen(host_.c_str(), port_);
}

void HttpServer::stop() {
    if (is_running_) {
        LOG_INFO("HttpServer", "Stopping HTTP server...");
        server_.stop();
        is_running_ = false;
    }
}

} // namespace commandforge
