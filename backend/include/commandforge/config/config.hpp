#pragma once

#include <string>
#include <cstdlib>
#include <nlohmann/json.hpp>

namespace commandforge {

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
        return {
            {"host", host},
            {"port", port},
            {"ai_provider", ai_provider},
            {"ai_model", ai_model},
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
