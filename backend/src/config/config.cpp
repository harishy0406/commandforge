#include "commandforge/config/config.hpp"
#include <cstdlib>

namespace commandforge {

static std::string getEnvOrDefault(const char* name, const std::string& defaultValue) {
    const char* val = std::getenv(name);
    return (val && *val) ? std::string(val) : defaultValue;
}

static int getEnvIntOrDefault(const char* name, int defaultValue) {
    const char* val = std::getenv(name);
    if (val && *val) {
        try {
            return std::stoi(val);
        } catch (...) {
            return defaultValue;
        }
    }
    return defaultValue;
}

static bool getEnvBoolOrDefault(const char* name, bool defaultValue) {
    const char* val = std::getenv(name);
    if (val && *val) {
        std::string s(val);
        return s == "true" || s == "1" || s == "yes" || s == "TRUE";
    }
    return defaultValue;
}

ServerConfig ServerConfig::loadFromEnv() {
    ServerConfig cfg;
    cfg.host = getEnvOrDefault("COMMANDFORGE_HOST", "0.0.0.0");
    cfg.port = getEnvIntOrDefault("COMMANDFORGE_PORT", 8080);
    cfg.db_path = getEnvOrDefault("COMMANDFORGE_DB_PATH", "commandforge.db");
    cfg.log_level = getEnvOrDefault("COMMANDFORGE_LOG_LEVEL", "info");

    cfg.ai_provider = getEnvOrDefault("COMMANDFORGE_AI_PROVIDER", "mock");
    cfg.ai_api_key = getEnvOrDefault("COMMANDFORGE_AI_API_KEY", "");
    cfg.ai_api_url = getEnvOrDefault("COMMANDFORGE_AI_API_URL", "https://api.openai.com/v1/chat/completions");
    cfg.ai_model = getEnvOrDefault("COMMANDFORGE_AI_MODEL", "gpt-4o-mini");

    cfg.execution_adapter = getEnvOrDefault("COMMANDFORGE_EXECUTION_ADAPTER", "docker");
    cfg.docker_image = getEnvOrDefault("COMMANDFORGE_DOCKER_IMAGE", "commandforge-sandbox:latest");
    cfg.execution_timeout_seconds = getEnvIntOrDefault("COMMANDFORGE_EXECUTION_TIMEOUT_SECONDS", 10);
    cfg.max_output_bytes = getEnvIntOrDefault("COMMANDFORGE_MAX_OUTPUT_BYTES", 65536);
    cfg.isolation_network_enabled = getEnvBoolOrDefault("COMMANDFORGE_ISOLATION_NETWORK_ENABLED", false);
    cfg.workspace_dir = getEnvOrDefault("COMMANDFORGE_WORKSPACE_DIR", "/tmp/commandforge_sandbox");
    cfg.history_retention_days = getEnvIntOrDefault("COMMANDFORGE_HISTORY_RETENTION_DAYS", 30);
    cfg.monitoring_interval_ms = getEnvIntOrDefault("COMMANDFORGE_MONITORING_INTERVAL_MS", 3000);

    return cfg;
}

} // namespace commandforge
