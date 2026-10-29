#include <gtest/gtest.h>
#include "commandforge/ai/mock_provider.hpp"

using namespace commandforge;

TEST(MockAIProviderTest, GeneratesCommandForLargestFiles) {
    MockProvider provider;
    GeneratedCommand cmd = provider.generateCommand("Find largest files");

    EXPECT_FALSE(cmd.command.empty());
    EXPECT_NE(cmd.command.find("du"), std::string::npos);
    EXPECT_FALSE(cmd.explanation.empty());
    EXPECT_FALSE(cmd.suggested_alternatives.empty());
    EXPECT_EQ(cmd.risk_level, RiskLevel::Low);
}

TEST(MockAIProviderTest, GeneratesCommandForPorts) {
    MockProvider provider;
    GeneratedCommand cmd = provider.generateCommand("Show open ports");

    EXPECT_FALSE(cmd.command.empty());
    EXPECT_NE(cmd.command.find("ss"), std::string::npos);
    EXPECT_EQ(cmd.risk_level, RiskLevel::Low);
}

TEST(MockAIProviderTest, FlagsDestructiveCommandsFromPrompt) {
    MockProvider provider;
    GeneratedCommand cmd = provider.generateCommand("clean old logs");

    EXPECT_FALSE(cmd.command.empty());
    EXPECT_TRUE(cmd.potentially_destructive);
}
