#include "commandforge/ai/openai_provider.hpp"
#include "commandforge/common/logger.hpp"
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <iostream>

namespace commandforge {

OpenAIProvider::OpenAIProvider(std::string api_key, std::string api_url, std::string model)
    : api_key_(std::move(api_key)),
      api_url_(std::move(api_url)),
      model_(std::move(model)) {}

std::string OpenAIProvider::buildRequestBody(const std::string& prompt, const std::string& context) {
    nlohmann::json systemMsg = {
        {"role", "system"},
        {"content", 
         "You are CommandForge, an expert Linux systems engineer and security specialist. "
         "The user will describe a task. Return ONLY a valid JSON object matching this schema:\n"
         "{\n"
         "  \"command\": \"<exact single or pipeline Linux shell command>\",\n"
         "  \"explanation\": \"<concise plain-English explanation of flags and parameters>\",\n"
         "  \"suggested_alternatives\": [\"<alt 1>\", \"<alt 2>\"]\n"
         "}\n"
         "Do not wrap in markdown quotes. Ensure the command is idiomatic, safe, and portable for standard Linux."
        }
    };

    std::string userPrompt = prompt;
    if (!context.empty()) {
        userPrompt += "\nContext: " + context;
    }

    nlohmann::json userMsg = {
        {"role", "user"},
        {"content", userPrompt}
    };

    nlohmann::json payload = {
        {"model", model_},
        {"messages", {systemMsg, userMsg}},
        {"temperature", 0.2},
        {"response_format", {{"type", "json_object"}}}
    };

    return payload.dump();
}

GeneratedCommand OpenAIProvider::parseModelResponse(const std::string& responseJson) {
    GeneratedCommand cmd;
    try {
        auto parsed = nlohmann::json::parse(responseJson);
        std::string rawContent = parsed["choices"][0]["message"]["content"];
        auto innerJson = nlohmann::json::parse(rawContent);

        cmd.command = innerJson.value("command", "");
        cmd.explanation = innerJson.value("explanation", "");
        if (innerJson.contains("suggested_alternatives") && innerJson["suggested_alternatives"].is_array()) {
            for (const auto& alt : innerJson["suggested_alternatives"]) {
                cmd.suggested_alternatives.push_back(alt.get<std::string>());
            }
        }
    } catch (const std::exception& e) {
        LOG_WARN("OpenAIProvider", "Failed to parse model response: " + std::string(e.what()));
    }
    return cmd;
}

GeneratedCommand OpenAIProvider::generateCommand(const std::string& prompt, const std::string& context) {
    if (api_key_.empty()) {
        LOG_INFO("OpenAIProvider", "No API key configured for OpenAI provider; delegating to local mock engine.");
        return fallback_provider_.generateCommand(prompt, context);
    }

    try {
        // Parse host and path from api_url_
        std::string host = "api.openai.com";
        std::string path = "/v1/chat/completions";
        bool isHttps = true;

        if (api_url_.rfind("http://", 0) == 0) {
            isHttps = false;
            std::string sub = api_url_.substr(7);
            auto slashPos = sub.find('/');
            if (slashPos != std::string::npos) {
                host = sub.substr(0, slashPos);
                path = sub.substr(slashPos);
            } else {
                host = sub;
                path = "/";
            }
        } else if (api_url_.rfind("https://", 0) == 0) {
            isHttps = true;
            std::string sub = api_url_.substr(8);
            auto slashPos = sub.find('/');
            if (slashPos != std::string::npos) {
                host = sub.substr(0, slashPos);
                path = sub.substr(slashPos);
            } else {
                host = sub;
                path = "/";
            }
        }

        std::string body = buildRequestBody(prompt, context);
        httplib::Headers headers = {
            {"Authorization", "Bearer " + api_key_},
            {"Content-Type", "application/json"}
        };

        std::string respBody;
        int statusCode = 0;

#ifdef CPPHTTPLIB_OPENSSL_SUPPORT
        if (isHttps) {
            httplib::SSLClient cli(host);
            cli.set_connection_timeout(5, 0);
            cli.set_read_timeout(15, 0);
            auto res = cli.Post(path, headers, body, "application/json");
            if (res) {
                statusCode = res->status;
                respBody = res->body;
            }
        } else
#endif
        {
            httplib::Client cli(host);
            cli.set_connection_timeout(5, 0);
            cli.set_read_timeout(15, 0);
            auto res = cli.Post(path, headers, body, "application/json");
            if (res) {
                statusCode = res->status;
                respBody = res->body;
            }
        }

        if (statusCode == 200 && !respBody.empty()) {
            GeneratedCommand cmd = parseModelResponse(respBody);
            if (!cmd.command.empty()) {
                cmd.risk_level = risk_analyzer_.assessRisk(cmd.command, cmd.risk_reason, cmd.potentially_destructive);
                cmd.requires_confirmation = (cmd.risk_level == RiskLevel::High || cmd.potentially_destructive);
                return cmd;
            }
        } else {
            LOG_WARN("OpenAIProvider", "Upstream API returned status code " + std::to_string(statusCode) + ", falling back to mock provider.");
        }
    } catch (const std::exception& e) {
        LOG_WARN("OpenAIProvider", "HTTP exception communicating with LLM endpoint: " + std::string(e.what()));
    }

    return fallback_provider_.generateCommand(prompt, context);
}

} // namespace commandforge
