#include "commandforge/config/config.hpp"
#include "commandforge/common/logger.hpp"
#include "commandforge/storage/sqlite_repository.hpp"
#include "commandforge/ai/mock_provider.hpp"
#include "commandforge/ai/openai_provider.hpp"
#include "commandforge/commands/risk_analyzer.hpp"
#include "commandforge/execution/execution_policy.hpp"
#include "commandforge/execution/docker_adapter.hpp"
#include "commandforge/execution/execution_engine.hpp"
#include "commandforge/monitoring/system_monitor.hpp"
#include "commandforge/api/controllers.hpp"
#include "commandforge/api/http_server.hpp"

#include <iostream>
#include <memory>
#include <csignal>

using namespace commandforge;

static std::unique_ptr<HttpServer> g_server;

void signalHandler(int signum) {
    std::cout << "\n[CommandForge] Received interrupt signal (" << signum << "). Initiating graceful shutdown..." << std::endl;
    if (g_server) {
        g_server->stop();
    }
}

int main(int argc, char* argv[]) {
    std::cout << R"(
   ______                                          __ ______                      
  / ____/___  ____ ___  ____ ___  ____ _____  ____/ // ____/___  _________ ____   
 / /   / __ \/ __ `__ \/ __ `__ \/ __ `/ __ \/ __  // /_  / __ \/ ___/ __ `/ _ \  
/ /___/ /_/ / / / / / / / / / / / /_/ / / / / /_/ // __/ / /_/ / /  / /_/ /  __/  
\____/\____/_/ /_/ /_/_/ /_/ /_/\__,_/_/ /_/\__,_//_/    \____/_/   \__, /\___/   
                                                                   /____/         
    )" << std::endl;
    std::cout << "CommandForge v1.0.0 - AI-Powered Linux Terminal Assistant" << std::endl;
    std::cout << "==========================================================" << std::endl;

    // Load configuration
    ServerConfig config = ServerConfig::loadFromEnv();
    if (config.log_level == "debug") {
        Logger::instance().setLevel(LogLevel::Debug);
    } else {
        Logger::instance().setLevel(LogLevel::Info);
    }

    LOG_INFO("Main", "Initializing CommandForge backend services...");

    // 1. Initialize SQLite Database Repository
    auto repository = std::make_shared<SqliteRepository>(config.db_path);
    if (!repository->initialize()) {
        LOG_ERROR("Main", "Failed to initialize database repository. Aborting.");
        return 1;
    }

    // 2. Initialize Risk Analyzer & Execution Policy
    auto risk_analyzer = std::make_shared<RiskAnalyzer>();
    ExecutionPolicy execution_policy(*risk_analyzer);

    // 3. Initialize Docker Execution Adapter & Execution Engine
    DockerAdapter docker_adapter(config.docker_image, config.workspace_dir, config.max_output_bytes);
    if (!docker_adapter.checkDockerAvailable()) {
        LOG_WARN("Main", "Docker engine CLI not detected on system PATH. Execution requests will report sandbox unavailable.");
    } else {
        LOG_INFO("Main", "Docker engine detected and ready for isolated container dispatch.");
    }
    auto execution_engine = std::make_shared<ExecutionEngine>(repository, execution_policy, docker_adapter);

    // 4. Initialize AI Provider (Supports Gemini, OpenRouter, NVIDIA, Ollama, Groq, Custom, Mock)
    std::shared_ptr<IAIProvider> ai_provider;
    if (config.ai_provider != "mock") {
        LOG_INFO("Main", "Configured " + config.ai_provider + " LLM provider with model: " + config.ai_model + " at " + config.ai_api_url);
        ai_provider = std::make_shared<OpenAIProvider>(config.ai_api_key, config.ai_api_url, config.ai_model);
    } else {
        LOG_INFO("Main", "Operating in zero-cost offline Demo Mode using local heuristics and Mock AI provider.");
        ai_provider = std::make_shared<MockProvider>();
    }

    // 5. Initialize System Monitor
    auto system_monitor = std::make_shared<SystemMonitor>();

    // 6. Initialize Controller & HTTP REST Server
    auto controller = std::make_shared<ApiController>(
        config, repository, ai_provider, risk_analyzer, execution_engine, system_monitor
    );

    g_server = std::make_unique<HttpServer>(config.host, config.port, controller);

    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    LOG_INFO("Main", "CommandForge API server listening on http://" + config.host + ":" + std::to_string(config.port) + "/api");
    g_server->start();

    LOG_INFO("Main", "CommandForge server shut down cleanly.");
    return 0;
}
