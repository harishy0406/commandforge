#pragma once

#include "commandforge/ai/ai_provider.hpp"
#include "commandforge/commands/risk_analyzer.hpp"
#include <unordered_map>

namespace commandforge {

class MockProvider : public IAIProvider {
public:
    MockProvider();
    ~MockProvider() override = default;

    GeneratedCommand generateCommand(const std::string& prompt, const std::string& context = "") override;

private:
    RiskAnalyzer risk_analyzer_;
    struct Preset {
        std::string command;
        std::string explanation;
        std::vector<std::string> alternatives;
    };
    std::unordered_map<std::string, Preset> preset_catalog_;
    void initializeCatalog();
};

} // namespace commandforge
