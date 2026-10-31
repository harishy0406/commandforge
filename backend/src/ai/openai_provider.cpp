#include "commandforge/ai/openai_provider.hpp"
#include "commandforge/common/logger.hpp"
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <iostream>

#if defined(_WIN32) || defined(_WIN64)
#include <windows.h>
#include <winhttp.h>
#endif

namespace commandforge {

OpenAIProvider::OpenAIProvider(std::string api_key, std::string api_url, std::string model)
    : api_key_(std::move(api_key)),
      api_url_(std::move(api_url)),
      model_(std::move(model)) {}

std::string OpenAIProvider::buildRequestBody(const std::string& prompt, const std::string& context, bool includeResponseFormat) {
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
        {"temperature", 0.2}
    };

    if (includeResponseFormat) {
        payload["response_format"] = {{"type", "json_object"}};
    }

    return payload.dump();
}

bool OpenAIProvider::executeHttpRequest(const std::string& body, int& statusCodeOut, std::string& responseBodyOut) {
#if defined(_WIN32) || defined(_WIN64)
    // Windows Native WinHTTP Client (Supports HTTP & HTTPS with TLS 1.2/1.3 and system certs)
    URL_COMPONENTS urlComp;
    ZeroMemory(&urlComp, sizeof(urlComp));
    urlComp.dwStructSize = sizeof(urlComp);
    urlComp.dwSchemeLength = (DWORD)-1;
    urlComp.dwHostNameLength = (DWORD)-1;
    urlComp.dwUrlPathLength = (DWORD)-1;
    urlComp.dwExtraInfoLength = (DWORD)-1;

    std::wstring wUrl(api_url_.begin(), api_url_.end());
    if (!WinHttpCrackUrl(wUrl.c_str(), (DWORD)wUrl.length(), 0, &urlComp)) {
        LOG_WARN("OpenAIProvider", "Failed to parse API URL: " + api_url_);
        return false;
    }

    std::wstring host(urlComp.lpszHostName, urlComp.dwHostNameLength);
    std::wstring path(urlComp.lpszUrlPath, urlComp.dwUrlPathLength);
    if (urlComp.dwExtraInfoLength > 0) {
        path += std::wstring(urlComp.lpszExtraInfo, urlComp.dwExtraInfoLength);
    }
    if (path.empty()) path = L"/";

    bool isHttps = (urlComp.nScheme == INTERNET_SCHEME_HTTPS);

    HINTERNET hSession = WinHttpOpen(L"CommandForge/1.0",
                                     WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                                     WINHTTP_NO_PROXY_NAME,
                                     WINHTTP_NO_PROXY_BYPASS, 0);
    if (!hSession) return false;

    // Timeout settings: 5s resolve, 5s connect, 25s send, 25s receive
    WinHttpSetTimeouts(hSession, 5000, 5000, 25000, 25000);

    HINTERNET hConnect = WinHttpConnect(hSession, host.c_str(), urlComp.nPort, 0);
    if (!hConnect) {
        WinHttpCloseHandle(hSession);
        return false;
    }

    DWORD flags = isHttps ? WINHTTP_FLAG_SECURE : 0;
    HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"POST", path.c_str(),
                                           NULL, WINHTTP_NO_REFERER,
                                           WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
    if (!hRequest) {
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return false;
    }

    std::vector<std::string> headerList;
    headerList.push_back("Content-Type: application/json");
    if (!api_key_.empty()) {
        headerList.push_back("Authorization: Bearer " + api_key_);
    }
    if (api_url_.find("openrouter.ai") != std::string::npos) {
        headerList.push_back("HTTP-Referer: https://commandforge.dev");
        headerList.push_back("X-Title: CommandForge");
    }

    for (const auto& h : headerList) {
        std::wstring wh(h.begin(), h.end());
        WinHttpAddRequestHeaders(hRequest, wh.c_str(), (DWORD)wh.length(),
                                 WINHTTP_ADDREQ_FLAG_ADD | WINHTTP_ADDREQ_FLAG_REPLACE);
    }

    BOOL bResults = WinHttpSendRequest(hRequest,
                                       WINHTTP_NO_ADDITIONAL_HEADERS, 0,
                                       (LPVOID)body.data(), (DWORD)body.size(),
                                       (DWORD)body.size(), 0);

    if (bResults) {
        bResults = WinHttpReceiveResponse(hRequest, NULL);
    }

    if (bResults) {
        DWORD dwStatusCode = 0;
        DWORD dwSize = sizeof(dwStatusCode);
        WinHttpQueryHeaders(hRequest,
                            WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                            WINHTTP_HEADER_NAME_BY_INDEX,
                            &dwStatusCode, &dwSize, WINHTTP_NO_HEADER_INDEX);
        statusCodeOut = (int)dwStatusCode;

        DWORD dwDownloaded = 0;
        do {
            dwSize = 0;
            if (!WinHttpQueryDataAvailable(hRequest, &dwSize)) break;
            if (dwSize == 0) break;

            std::vector<char> buffer(dwSize);
            if (WinHttpReadData(hRequest, buffer.data(), dwSize, &dwDownloaded)) {
                responseBodyOut.append(buffer.data(), dwDownloaded);
            }
        } while (dwSize > 0);
    }

    WinHttpCloseHandle(hRequest);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);
    return bResults != FALSE;
#else
    // POSIX Fallback using cpp-httplib
    std::string schemeHostPort;
    std::string path = "/v1/chat/completions";
    auto slashPos = api_url_.find('/', 8);
    if (slashPos != std::string::npos) {
        schemeHostPort = api_url_.substr(0, slashPos);
        path = api_url_.substr(slashPos);
    } else {
        schemeHostPort = api_url_;
    }

    httplib::Headers headers = {
        {"Content-Type", "application/json"}
    };
    if (!api_key_.empty()) {
        headers.emplace("Authorization", "Bearer " + api_key_);
    }
    if (api_url_.find("openrouter.ai") != std::string::npos) {
        headers.emplace("HTTP-Referer", "https://commandforge.dev");
        headers.emplace("X-Title", "CommandForge");
    }

    httplib::Client cli(schemeHostPort);
    cli.set_connection_timeout(5, 0);
    cli.set_read_timeout(25, 0);

    auto res = cli.Post(path, headers, body, "application/json");
    if (res) {
        statusCodeOut = res->status;
        responseBodyOut = res->body;
        return true;
    }
    return false;
#endif
}

GeneratedCommand OpenAIProvider::parseModelResponse(const std::string& responseJson) {
    GeneratedCommand cmd;
    try {
        auto parsed = nlohmann::json::parse(responseJson);
        std::string rawContent;
        if (parsed.contains("choices") && parsed["choices"].is_array() && !parsed["choices"].empty()) {
            auto firstChoice = parsed["choices"][0];
            if (firstChoice.contains("message") && firstChoice["message"].contains("content")) {
                if (firstChoice["message"]["content"].is_string()) {
                    rawContent = firstChoice["message"]["content"].get<std::string>();
                }
            } else if (firstChoice.contains("text") && firstChoice["text"].is_string()) {
                rawContent = firstChoice["text"].get<std::string>();
            }
        }

        if (rawContent.empty()) {
            return cmd;
        }

        // 1. Try stripping markdown code fences if present (```json ... ``` or ``` ...)
        std::string cleanJson = rawContent;
        auto startFence = cleanJson.find("```json");
        if (startFence == std::string::npos) {
            startFence = cleanJson.find("```");
        }
        if (startFence != std::string::npos) {
            auto firstNewline = cleanJson.find('\n', startFence);
            if (firstNewline != std::string::npos) {
                auto endFence = cleanJson.find("```", firstNewline);
                if (endFence != std::string::npos) {
                    cleanJson = cleanJson.substr(firstNewline + 1, endFence - (firstNewline + 1));
                }
            }
        }

        bool parsedOk = false;
        try {
            auto innerJson = nlohmann::json::parse(cleanJson);
            cmd.command = innerJson.value("command", "");
            cmd.explanation = innerJson.value("explanation", "");
            if (innerJson.contains("suggested_alternatives") && innerJson["suggested_alternatives"].is_array()) {
                for (const auto& alt : innerJson["suggested_alternatives"]) {
                    if (alt.is_string()) {
                        cmd.suggested_alternatives.push_back(alt.get<std::string>());
                    }
                }
            }
            parsedOk = !cmd.command.empty();
        } catch (...) {}

        // 2. If direct parse failed, attempt to find curly braces substring { ... }
        if (!parsedOk) {
            auto firstBrace = cleanJson.find('{');
            auto lastBrace = cleanJson.rfind('}');
            if (firstBrace != std::string::npos && lastBrace != std::string::npos && lastBrace > firstBrace) {
                try {
                    auto innerJson = nlohmann::json::parse(cleanJson.substr(firstBrace, lastBrace - firstBrace + 1));
                    cmd.command = innerJson.value("command", "");
                    cmd.explanation = innerJson.value("explanation", "");
                    parsedOk = !cmd.command.empty();
                } catch (...) {}
            }
        }

        // 3. Fallback for natural language text models (like some local Ollama or raw completions)
        if (!parsedOk) {
            // Find code block ```bash or ```
            auto fenceStart = rawContent.find("```");
            if (fenceStart != std::string::npos) {
                auto codeStart = rawContent.find('\n', fenceStart);
                if (codeStart != std::string::npos) {
                    auto fenceEnd = rawContent.find("```", codeStart);
                    if (fenceEnd != std::string::npos) {
                        cmd.command = rawContent.substr(codeStart + 1, fenceEnd - (codeStart + 1));
                        while (!cmd.command.empty() && (cmd.command.back() == '\n' || cmd.command.back() == '\r' || cmd.command.back() == ' ')) {
                            cmd.command.pop_back();
                        }
                        cmd.explanation = rawContent.substr(0, fenceStart);
                        if (cmd.explanation.empty()) {
                            cmd.explanation = "Extracted Linux command from model output.";
                        }
                        parsedOk = !cmd.command.empty();
                    }
                }
            }
        }

        // If command is found, assess risk
        if (!cmd.command.empty()) {
            cmd.risk_level = risk_analyzer_.assessRisk(cmd.command, cmd.risk_reason, cmd.potentially_destructive);
            cmd.requires_confirmation = (cmd.risk_level == RiskLevel::High || cmd.potentially_destructive);
        }
    } catch (const std::exception& e) {
        LOG_WARN("OpenAIProvider", "Failed to parse model response: " + std::string(e.what()));
    }
    return cmd;
}

GeneratedCommand OpenAIProvider::generateCommand(const std::string& prompt, const std::string& context) {
    bool isLocal = (api_url_.find("localhost") != std::string::npos || 
                    api_url_.find("127.0.0.1") != std::string::npos ||
                    api_url_.find("0.0.0.0") != std::string::npos ||
                    api_url_.find("ollama") != std::string::npos);

    if (api_key_.empty() && !isLocal) {
        LOG_INFO("OpenAIProvider", "No API key configured for remote provider (" + api_url_ + "); falling back to local mock engine.");
        return fallback_provider_.generateCommand(prompt, context);
    }

    try {
        std::string body = buildRequestBody(prompt, context, true);
        std::string respBody;
        int statusCode = 0;

        bool ok = executeHttpRequest(body, statusCode, respBody);

        // If status code is 400, retry without response_format (some models/providers reject response_format)
        if (ok && statusCode == 400) {
            LOG_INFO("OpenAIProvider", "API returned 400 with response_format json_object; retrying with plain prompt format...");
            body = buildRequestBody(prompt, context, false);
            respBody.clear();
            ok = executeHttpRequest(body, statusCode, respBody);
        }

        if (ok && statusCode == 200 && !respBody.empty()) {
            GeneratedCommand cmd = parseModelResponse(respBody);
            if (!cmd.command.empty()) {
                return cmd;
            }
        } else {
            LOG_WARN("OpenAIProvider", "Upstream API returned status code " + std::to_string(statusCode) + " (" + respBody.substr(0, 200) + "), falling back to mock provider.");
        }
    } catch (const std::exception& e) {
        LOG_WARN("OpenAIProvider", "HTTP exception communicating with LLM endpoint: " + std::string(e.what()));
    }

    return fallback_provider_.generateCommand(prompt, context);
}

} // namespace commandforge
