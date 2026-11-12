#include <gtest/gtest.h>
#include "commandforge/monitoring/system_monitor.hpp"

using namespace commandforge;

TEST(SystemMonitorTest, CollectsRealisticMetrics) {
    SystemMonitor monitor;
    SystemMetrics m = monitor.getMetrics();

    EXPECT_GE(m.cpu_usage_pct, 0.0);
    EXPECT_LE(m.cpu_usage_pct, 100.0);

    EXPECT_GT(m.memory_total_mb, 0.0);
    EXPECT_GE(m.memory_used_mb, 0.0);
    EXPECT_LE(m.memory_usage_pct, 100.0);

    EXPECT_GT(m.disk_total_gb, 0.0);
    EXPECT_GE(m.active_processes, 1);
    EXPECT_FALSE(m.timestamp.empty());
    EXPECT_FALSE(m.metrics_source.empty());
}

TEST(SystemMonitorTest, ProbesSystemDiagnostics) {
    SystemMonitor monitor;
    SystemDiagnostics diag = monitor.getDiagnostics(true);

    EXPECT_FALSE(diag.os_platform.empty());
    EXPECT_FALSE(diag.architecture.empty());
    EXPECT_GE(diag.logical_cores, 1);
    EXPECT_GE(diag.memory_rss_mb, 0.0);
    EXPECT_TRUE(diag.docker_available);
    EXPECT_FALSE(diag.docker_socket.empty());
    EXPECT_EQ(diag.active_ast_rules, 21);

    nlohmann::json j = diag.toJson();
    EXPECT_TRUE(j.contains("os_platform"));
    EXPECT_TRUE(j.contains("docker"));
    EXPECT_TRUE(j["docker"]["available"].get<bool>());
}
