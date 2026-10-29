#include <gtest/gtest.h>
#include "commandforge/storage/sqlite_repository.hpp"
#include <cstdio>

using namespace commandforge;

TEST(StorageTest, InitializesAndPerformsCrud) {
    std::string testDb = "test_commandforge.db";
    std::remove(testDb.c_str());

    SqliteRepository repo(testDb);
    ASSERT_TRUE(repo.initialize());

    CommandRecord rec;
    rec.id = "test-123";
    rec.prompt = "Test prompt";
    rec.command = "uptime";
    rec.explanation = "Shows uptime";
    rec.risk_level = "low";
    rec.status = "success";
    rec.exit_code = 0;
    rec.stdout_output = "up 2 hours";
    rec.duration_ms = 15.5;
    rec.created_at = "2026-10-29 18:00:00";

    EXPECT_TRUE(repo.saveExecution(rec));

    auto retrieved = repo.getById("test-123");
    ASSERT_TRUE(retrieved.has_value());
    EXPECT_EQ(retrieved->command, "uptime");
    EXPECT_EQ(retrieved->exit_code, 0);

    int total = 0;
    auto list = repo.getHistory(1, 10, "success", "", total);
    EXPECT_GE(total, 1);

    DashboardSummary summary = repo.getSummary();
    EXPECT_GE(summary.total_executed, 1);

    std::remove(testDb.c_str());
}
