#pragma once

#include "commandforge/ai/ai_provider.hpp"
#include "commandforge/ai/mock_provider.hpp"
#include "commandforge/commands/risk_analyzer.hpp"
#include <string>
#include <memory>
#include <map>

namespace commandforge {

class OpenAIProvider : public IAIProvider {
public:
    OpenAIProvider(std::string api_key, std::string api_url, std::string model);
    ~OpenAIProvider() override = default;

    GeneratedCommand generateCommand(const std::string& prompt, const std::string& context = "") override;

    void setApiKey(std::string key) { api_key_ = std::move(key); }
    void setApiUrl(std::string url) { api_url_ = std::move(url); }
    void setModel(std::string model) { model_ = std::move(model); }

    const std::string& getModel() const { return model_; }
    const std::string& getApiUrl() const { return api_url_; }

private:
    std::string api_key_;
    std::string api_url_;
    std::string model_;
    RiskAnalyzer risk_analyzer_;
    MockProvider fallback_provider_;

    std::string buildRequestBody(const std::string& prompt, const std::string& context, bool includeResponseFormat);
    GeneratedCommand parseModelResponse(const std::string& responseJson);
    bool executeHttpRequest(const std::string& body, int& statusCodeOut, std::string& responseBodyOut);
};

} // namespace commandforge
