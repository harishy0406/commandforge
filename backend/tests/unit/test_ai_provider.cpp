#include <gtest/gtest.h>
#include "commandforge/ai/mock_provider.hpp"
#include "commandforge/ai/openai_provider.hpp"
#include "commandforge/config/config.hpp"

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

TEST(AIProviderPresetTest, IncludesAllFreeAndLocalProviders) {
    auto presets = getAIProviderPresets();
    EXPECT_GE(presets.size(), 7u);

    bool hasGemini = false;
    bool hasOpenRouter = false;
    bool hasNvidia = false;
    bool hasOllama = false;
    bool hasGroq = false;

    for (const auto& p : presets) {
        if (p.id == "gemini") {
            hasGemini = true;
            EXPECT_NE(p.default_url.find("generativelanguage.googleapis.com"), std::string::npos);
            EXPECT_EQ(p.default_model, "gemini-2.0-flash");
        } else if (p.id == "openrouter") {
            hasOpenRouter = true;
            EXPECT_NE(p.default_url.find("openrouter.ai"), std::string::npos);
            EXPECT_NE(p.default_model.find(":free"), std::string::npos);
        } else if (p.id == "nvidia") {
            hasNvidia = true;
            EXPECT_NE(p.default_url.find("nvidia.com"), std::string::npos);
        } else if (p.id == "ollama") {
            hasOllama = true;
            EXPECT_FALSE(p.requires_api_key);
            EXPECT_NE(p.default_url.find("11434"), std::string::npos);
        } else if (p.id == "groq") {
            hasGroq = true;
            EXPECT_NE(p.default_url.find("groq.com"), std::string::npos);
        }
    }

    EXPECT_TRUE(hasGemini);
    EXPECT_TRUE(hasOpenRouter);
    EXPECT_TRUE(hasNvidia);
    EXPECT_TRUE(hasOllama);
    EXPECT_TRUE(hasGroq);
}

TEST(OpenAIProviderTest, SafeFallbackWhenKeylessOrOffline) {
    OpenAIProvider provider("", "https://api.openai.com/v1/chat/completions", "gpt-4o-mini");
    GeneratedCommand cmd = provider.generateCommand("find largest files");

    EXPECT_FALSE(cmd.command.empty());
    EXPECT_NE(cmd.command.find("du"), std::string::npos);
    EXPECT_EQ(cmd.risk_level, RiskLevel::Low);
}
