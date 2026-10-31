#pragma once

#include "commandforge/common/types.hpp"
#include "commandforge/config/config.hpp"
#include "commandforge/storage/history_repository.hpp"
#include "commandforge/ai/ai_provider.hpp"
#include "commandforge/commands/risk_analyzer.hpp"
#include "commandforge/execution/execution_engine.hpp"
#include "commandforge/monitoring/system_monitor.hpp"
#include <memory>
#include <string>
#include <nlohmann/json.hpp>

namespace commandforge {

class ApiController {
public:
    ApiController(ServerConfig config,
                  std::shared_ptr<IHistoryRepository> repository,
                  std::shared_ptr<IAIProvider> ai_provider,
                  std::shared_ptr<RiskAnalyzer> risk_analyzer,
                  std::shared_ptr<ExecutionEngine> execution_engine,
                  std::shared_ptr<SystemMonitor> system_monitor);

    nlohmann::json handleHealth();
    nlohmann::json handleDashboardSummary();
    nlohmann::json handleGenerateCommand(const nlohmann::json& requestBody);
    nlohmann::json handleValidateCommand(const nlohmann::json& requestBody);
    nlohmann::json handleExecuteCommand(const nlohmann::json& requestBody);
    nlohmann::json handleGetHistory(int page, int limit, const std::string& status, const std::string& search);
    nlohmann::json handleGetHistoryById(const std::string& id);
    nlohmann::json handleCancelExecution(const std::string& id);
    nlohmann::json handleGetSystemMetrics();
    nlohmann::json handleGetSettings();
    nlohmann::json handleUpdateSettings(const nlohmann::json& requestBody);
    nlohmann::json handleGetAIProviders();

    void reconfigureAIProvider();

private:
    ServerConfig config_;
    std::shared_ptr<IHistoryRepository> repository_;
    std::shared_ptr<IAIProvider> ai_provider_;
    std::shared_ptr<RiskAnalyzer> risk_analyzer_;
    std::shared_ptr<ExecutionEngine> execution_engine_;
    std::shared_ptr<SystemMonitor> system_monitor_;
};

} // namespace commandforge
