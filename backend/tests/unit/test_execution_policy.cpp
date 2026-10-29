#include <gtest/gtest.h>
#include "commandforge/execution/execution_policy.hpp"

using namespace commandforge;

TEST(ExecutionPolicyTest, RejectsExecutionWithoutUserApproval) {
    RiskAnalyzer analyzer;
    ExecutionPolicy policy(analyzer);

    ExecutionRequest req;
    req.command = "ls -la";
    req.user_approved = false;

    std::string reason;
    bool allowed = policy.evaluate(req, reason);
    EXPECT_FALSE(allowed);
    EXPECT_NE(reason.find("approval"), std::string::npos);
}

TEST(ExecutionPolicyTest, AllowsApprovedSafeCommands) {
    RiskAnalyzer analyzer;
    ExecutionPolicy policy(analyzer);

    ExecutionRequest req;
    req.command = "ls -la";
    req.user_approved = true;
    req.risk_level = RiskLevel::Low;

    std::string reason;
    bool allowed = policy.evaluate(req, reason);
    EXPECT_TRUE(allowed);
}

TEST(ExecutionPolicyTest, RejectsProhibitedCommandsEvenIfUserApproved) {
    RiskAnalyzer analyzer;
    ExecutionPolicy policy(analyzer);

    ExecutionRequest req;
    req.command = "rm -rf /";
    req.user_approved = true;
    req.risk_level = RiskLevel::High;

    std::string reason;
    bool allowed = policy.evaluate(req, reason);
    EXPECT_FALSE(allowed);
    EXPECT_NE(reason.find("Security Boundary Violation"), std::string::npos);
}
