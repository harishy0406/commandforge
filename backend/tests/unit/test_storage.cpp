#include <gtest/gtest.h>
#include "commandforge/storage/sqlite_repository.hpp"
#include <cstdio>

using namespace commandforge;

TEST(StorageTest, InitializesAndPerformsCrud) {
    std::string testDb = "test_commandforge.db";
    std::remove(testDb.c_str());

    {
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
    }

    std::remove(testDb.c_str());
}

TEST(StorageTest, PurgesHistoricalRecords) {
    std::string testDb = "test_purge.db";
    std::remove(testDb.c_str());

    {
        SqliteRepository repo(testDb);
        ASSERT_TRUE(repo.initialize());

        CommandRecord rec;
        rec.id = "purge-target-1";
        rec.command = "ls -la";
        rec.created_at = "2020-01-01 00:00:00";
        EXPECT_TRUE(repo.saveExecution(rec));

        // Purge records older than 30 days
        int purged = repo.purgeHistory(30);
        EXPECT_GE(purged, 1);

        // All historical records should be cleared on total purge
        int totalPurged = repo.purgeHistory(0);
        EXPECT_GE(totalPurged, 0);

        int totalRemaining = 0;
        auto list = repo.getHistory(1, 10, "all", "", totalRemaining);
        EXPECT_EQ(totalRemaining, 0);
    }

    std::remove(testDb.c_str());
}
