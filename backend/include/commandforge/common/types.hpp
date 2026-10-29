#pragma once

#include <string>
#include <vector>
#include <optional>
#include <chrono>
#include <nlohmann/json.hpp>

namespace commandforge {

enum class RiskLevel {
    Low,
    Medium,
    High
};

inline std::string riskLevelToString(RiskLevel level) {
    switch (level) {
        case RiskLevel::Low: return "low";
        case RiskLevel::Medium: return "medium";
        case RiskLevel::High: return "high";
    }
    return "unknown";
}

inline RiskLevel stringToRiskLevel(const std::string& str) {
    if (str == "high") return RiskLevel::High;
    if (str == "medium") return RiskLevel::Medium;
    return RiskLevel::Low;
}

enum class ExecutionStatus {
    Pending,
    Running,
    Success,
    Failed,
    Timeout,
    Rejected,
    Cancelled
};

inline std::string executionStatusToString(ExecutionStatus status) {
    switch (status) {
        case ExecutionStatus::Pending: return "pending";
        case ExecutionStatus::Running: return "running";
        case ExecutionStatus::Success: return "success";
        case ExecutionStatus::Failed: return "failed";
        case ExecutionStatus::Timeout: return "timeout";
        case ExecutionStatus::Rejected: return "rejected";
        case ExecutionStatus::Cancelled: return "cancelled";
    }
    return "unknown";
}

inline ExecutionStatus stringToExecutionStatus(const std::string& str) {
    if (str == "pending") return ExecutionStatus::Pending;
    if (str == "running") return ExecutionStatus::Running;
    if (str == "success") return ExecutionStatus::Success;
    if (str == "failed") return ExecutionStatus::Failed;
    if (str == "timeout") return ExecutionStatus::Timeout;
    if (str == "rejected") return ExecutionStatus::Rejected;
    if (str == "cancelled") return ExecutionStatus::Cancelled;
    return ExecutionStatus::Failed;
}

struct GeneratedCommand {
    std::string command;
    std::string explanation;
    RiskLevel risk_level{RiskLevel::Low};
    std::string risk_reason;
    bool potentially_destructive{false};
    bool requires_confirmation{false};
    std::vector<std::string> suggested_alternatives;

    nlohmann::json toJson() const {
        return {
            {"command", command},
            {"explanation", explanation},
            {"risk_level", riskLevelToString(risk_level)},
            {"risk_reason", risk_reason},
            {"potentially_destructive", potentially_destructive},
            {"requires_confirmation", requires_confirmation},
            {"suggested_alternatives", suggested_alternatives}
        };
    }
};

struct ValidationResult {
    bool is_valid{true};
    RiskLevel risk_level{RiskLevel::Low};
    std::vector<std::string> warnings;
    std::vector<std::string> blocked_reasons;
    bool is_allowed{true};

    nlohmann::json toJson() const {
        return {
            {"is_valid", is_valid},
            {"risk_level", riskLevelToString(risk_level)},
            {"warnings", warnings},
            {"blocked_reasons", blocked_reasons},
            {"is_allowed", is_allowed}
        };
    }
};

struct ExecutionRequest {
    std::string command;
    std::string prompt;
    RiskLevel risk_level{RiskLevel::Low};
    bool user_approved{false};
    int timeout_seconds{10};
};

struct ExecutionResult {
    std::string id;
    ExecutionStatus status{ExecutionStatus::Pending};
    int exit_code{-1};
    std::string stdout_output;
    std::string stderr_output;
    double duration_ms{0.0};
    bool output_truncated{false};
    std::string executed_at;
    std::string environment;

    nlohmann::json toJson() const {
        return {
            {"id", id},
            {"status", executionStatusToString(status)},
            {"exit_code", exit_code},
            {"stdout", stdout_output},
            {"stderr", stderr_output},
            {"duration_ms", duration_ms},
            {"output_truncated", output_truncated},
            {"executed_at", executed_at},
            {"environment", environment}
        };
    }
};

struct CommandRecord {
    std::string id;
    std::string prompt;
    std::string command;
    std::string explanation;
    std::string risk_level;
    std::string status;
    int exit_code{0};
    std::string stdout_output;
    std::string stderr_output;
    double duration_ms{0.0};
    std::string created_at;

    nlohmann::json toJson() const {
        return {
            {"id", id},
            {"prompt", prompt},
            {"command", command},
            {"explanation", explanation},
            {"risk_level", risk_level},
            {"status", status},
            {"exit_code", exit_code},
            {"stdout", stdout_output},
            {"stderr", stderr_output},
            {"duration_ms", duration_ms},
            {"created_at", created_at}
        };
    }
};

struct SystemMetrics {
    double cpu_usage_pct{0.0};
    double memory_used_mb{0.0};
    double memory_total_mb{0.0};
    double memory_usage_pct{0.0};
    double disk_used_gb{0.0};
    double disk_total_gb{0.0};
    double disk_usage_pct{0.0};
    int active_processes{0};
    std::string timestamp;
    std::string metrics_source;

    nlohmann::json toJson() const {
        return {
            {"cpu_usage_pct", cpu_usage_pct},
            {"memory_used_mb", memory_used_mb},
            {"memory_total_mb", memory_total_mb},
            {"memory_usage_pct", memory_usage_pct},
            {"disk_used_gb", disk_used_gb},
            {"disk_total_gb", disk_total_gb},
            {"disk_usage_pct", disk_usage_pct},
            {"active_processes", active_processes},
            {"timestamp", timestamp},
            {"metrics_source", metrics_source}
        };
    }
};

struct DashboardSummary {
    int total_generated{0};
    int total_executed{0};
    int successful_executions{0};
    int failed_executions{0};
    double average_duration_ms{0.0};
    double success_rate{0.0};
    double cpu_usage_pct{0.0};
    double memory_usage_pct{0.0};
    std::vector<CommandRecord> recent_activity;

    nlohmann::json toJson() const {
        nlohmann::json recent = nlohmann::json::array();
        for (const auto& item : recent_activity) {
            recent.push_back(item.toJson());
        }
        return {
            {"total_generated", total_generated},
            {"total_executed", total_executed},
            {"successful_executions", successful_executions},
            {"failed_executions", failed_executions},
            {"average_duration_ms", average_duration_ms},
            {"success_rate", success_rate},
            {"cpu_usage_pct", cpu_usage_pct},
            {"memory_usage_pct", memory_usage_pct},
            {"recent_activity", recent}
        };
    }
};

} // namespace commandforge
