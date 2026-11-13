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

        // 4b. History Export (CSV & JSON, full and filtered)
        std::string csvExport = controller.handleExportHistory("csv");
        EXPECT_FALSE(csvExport.empty());
        EXPECT_NE(csvExport.find("id,created_at,risk_level"), std::string::npos);

        std::string jsonExport = controller.handleExportHistory("json");
        EXPECT_FALSE(jsonExport.empty());
        auto parsedExport = nlohmann::json::parse(jsonExport);
        EXPECT_TRUE(parsedExport.is_array());
        EXPECT_GE(parsedExport.size(), 1u);

        std::string rejectedJson = controller.handleExportHistory("json", "rejected", "");
        auto parsedRejected = nlohmann::json::parse(rejectedJson);
        EXPECT_TRUE(parsedRejected.is_array());
        for (const auto& rec : parsedRejected) {
            EXPECT_EQ(rec["status"], "rejected");
        }

        // 4c. History Pagination Clamping
        auto clampedHistory = controller.handleGetHistory(-2, 500, "", "");
        EXPECT_EQ(clampedHistory["page"], 1);
        EXPECT_EQ(clampedHistory["limit"], 20);

        // 5. Settings & Diagnostics
        auto settings = controller.handleGetSettings();
        EXPECT_EQ(settings["ai_provider"], "mock");

        auto diag = controller.handleGetSystemDiagnostics();
        EXPECT_EQ(diag["security"]["active_ast_rules"], 21);

        // 6. Negative Purge Retention Guard
        auto purgeRes = controller.handlePurgeHistory(-5);
        EXPECT_EQ(purgeRes["status"], "success");
        EXPECT_EQ(purgeRes["older_than_days"], 0);

        // 7. Execution Status & Input Validation
        auto execStatusExisting = controller.handleGetExecutionStatus("seed-1");
        EXPECT_TRUE(execStatusExisting.contains("status"));
        EXPECT_FALSE(execStatusExisting["active"].get<bool>());

        auto execStatusMissing = controller.handleGetExecutionStatus("missing-task-id");
        EXPECT_EQ(execStatusMissing["status"], "not_found");
        EXPECT_FALSE(execStatusMissing["active"].get<bool>());

        auto emptyCmdRes = controller.handleExecuteCommand({{"command", "   "}});
        EXPECT_TRUE(emptyCmdRes.contains("error"));

        auto badTimeoutTypeRes = controller.handleExecuteCommand({{"command", "ls"}, {"timeout_seconds", "five"}});
        EXPECT_TRUE(badTimeoutTypeRes.contains("error"));

        auto outOfRangeTimeoutRes = controller.handleExecuteCommand({{"command", "ls"}, {"timeout_seconds", 500}});
        EXPECT_TRUE(outOfRangeTimeoutRes.contains("error"));
    }

    std::remove(testDb.c_str());
}
