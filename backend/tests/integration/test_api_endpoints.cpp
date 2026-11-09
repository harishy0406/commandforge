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

    {
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
        EXPECT_TRUE(health.contains("uptime_seconds"));

        // 2. Generate
        nlohmann::json genReq = {{"prompt", "Find the largest files in directory"}};
        auto genRes = controller.handleGenerateCommand(genReq);
        EXPECT_TRUE(genRes.contains("command"));
        EXPECT_FALSE(genRes["command"].get<std::string>().empty());

        // 3. Validate
        nlohmann::json valReq = {{"command", genRes["command"]}};
        auto valRes = controller.handleValidateCommand(valReq);
        EXPECT_TRUE(valRes["is_valid"].get<bool>());

        // 3b. Batch Validate
        nlohmann::json batchReq = {{"commands", nlohmann::json::array({"df -h", "rm -rf /", "uptime"})}};
        auto batchRes = controller.handleValidateBatchCommand(batchReq);
        EXPECT_TRUE(batchRes.contains("summary"));
        EXPECT_EQ(batchRes["summary"]["total"], 3);
        EXPECT_EQ(batchRes["summary"]["allowed"], 2);
        EXPECT_EQ(batchRes["summary"]["blocked"], 1);
        EXPECT_EQ(batchRes["summary"]["highest_risk"], "high");
        EXPECT_FALSE(batchRes["summary"]["all_allowed"].get<bool>());

        // 4. Summary
        auto summary = controller.handleDashboardSummary();
        EXPECT_TRUE(summary.contains("total_executed"));

        // 4b. History Export (CSV & JSON)
        std::string csvExport = controller.handleExportHistory("csv");
        EXPECT_FALSE(csvExport.empty());
        EXPECT_NE(csvExport.find("id,created_at,risk_level"), std::string::npos);

        std::string jsonExport = controller.handleExportHistory("json");
        EXPECT_FALSE(jsonExport.empty());
        auto parsedExport = nlohmann::json::parse(jsonExport);
        EXPECT_TRUE(parsedExport.is_array());

        // 5. Settings
        auto settings = controller.handleGetSettings();
        EXPECT_EQ(settings["ai_provider"], "mock");
    }

    std::remove(testDb.c_str());
}
