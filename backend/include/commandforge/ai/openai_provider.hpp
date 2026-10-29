#pragma once

#include "commandforge/ai/ai_provider.hpp"
#include "commandforge/ai/mock_provider.hpp"
#include "commandforge/commands/risk_analyzer.hpp"
#include <string>
#include <memory>

namespace commandforge {

class OpenAIProvider : public IAIProvider {
public:
    OpenAIProvider(std::string api_key, std::string api_url, std::string model);
    ~OpenAIProvider() override = default;

    GeneratedCommand generateCommand(const std::string& prompt, const std::string& context = "") override;

private:
    std::string api_key_;
    std::string api_url_;
    std::string model_;
    RiskAnalyzer risk_analyzer_;
    MockProvider fallback_provider_;

    std::string buildRequestBody(const std::string& prompt, const std::string& context);
    GeneratedCommand parseModelResponse(const std::string& responseJson);
};

} // namespace commandforge
