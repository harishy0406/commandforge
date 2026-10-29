#include <gtest/gtest.h>
#include "commandforge/api/controllers.hpp"
#include "commandforge/storage/sqlite_repository.hpp"
#include "commandforge/ai/mock_provider.hpp"
#include "commandforge/commands/risk_analyzer.hpp"
#include "commandforge/execution/execution_policy.hpp"
#include "commandforge/execution/docker_adapter.hpp"
#include "commandforge/execution/execution_engine.hpp"
#include "commandforge/monitoring/system_monitor.hpp"

#include <cstdio>

using namespace commandforge;

TEST(ApiIntegrationTest, FullControllerWorkflow) {
    std::string testDb = "integration_test.db";
    std::remove(testDb.c_str());

    ServerConfig config;
    config.db_path = testDb;

    auto repo = std::make_shared<SqliteRepository>(testDb);
    repo->initialize();

    auto ai = std::make_shared<MockProvider>();
    auto risk = std::make_shared<RiskAnalyzer>();
    ExecutionPolicy policy(*risk);
    DockerAdapter docker("commandforge-sandbox:latest", "/tmp", 65536);
    auto execEngine = std::make_shared<ExecutionEngine>(repo, policy, docker);
    auto monitor = std::make_shared<SystemMonitor>();

    ApiController controller(config, repo, ai, risk, execEngine, monitor);

    // 1. Health
    auto health = controller.handleHealth();
    EXPECT_EQ(health["status"], "healthy");

    // 2. Generate
    nlohmann::json genReq = {{"prompt", "Find the largest files in directory"}};
    auto genRes = controller.handleGenerateCommand(genReq);
    EXPECT_TRUE(genRes.contains("command"));
    EXPECT_FALSE(genRes["command"].get<std::string>().empty());

    // 3. Validate
    nlohmann::json valReq = {{"command", genRes["command"]}};
    auto valRes = controller.handleValidateCommand(valReq);
    EXPECT_TRUE(valRes["is_valid"].get<bool>());

    // 4. Summary
    auto summary = controller.handleDashboardSummary();
    EXPECT_TRUE(summary.contains("total_executed"));

    // 5. Settings
    auto settings = controller.handleGetSettings();
    EXPECT_EQ(settings["ai_provider"], "mock");

    std::remove(testDb.c_str());
}
