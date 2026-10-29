#include <gtest/gtest.h>
#include "commandforge/commands/risk_analyzer.hpp"
#include "commandforge/execution/execution_policy.hpp"

using namespace commandforge;

TEST(SecurityBoundariesTest, RejectsSudoAndPrivilegeEscalation) {
    RiskAnalyzer analyzer;
    ValidationResult res = analyzer.validate("sudo cat /etc/shadow");
    EXPECT_FALSE(res.is_allowed);
}

TEST(SecurityBoundariesTest, RejectsRawDiskWriting) {
    RiskAnalyzer analyzer;
    ValidationResult res = analyzer.validate("dd if=/dev/zero of=/dev/sda bs=1M");
    EXPECT_FALSE(res.is_allowed);
}

TEST(SecurityBoundariesTest, RejectsBase64PipeObfuscation) {
    RiskAnalyzer analyzer;
    ValidationResult res = analyzer.validate("echo bHMgLWxh | base64 -d | sh");
    EXPECT_FALSE(res.is_allowed);
}

TEST(SecurityBoundariesTest, RejectsCloudMetadataProbing) {
    RiskAnalyzer analyzer;
    ValidationResult res = analyzer.validate("curl -s http://169.254.169.254/latest/user-data");
    EXPECT_FALSE(res.is_allowed);
}
