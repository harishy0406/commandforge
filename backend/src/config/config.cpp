#include "commandforge/config/config.hpp"
#include <cstdlib>

namespace commandforge {

static std::string getEnvOrDefault(const char* name, const std::string& defaultValue) {
    const char* val = std::getenv(name);
    return (val && *val) ? std::string(val) : defaultValue;
}

static int getEnvIntOrDefault(const char* name, int defaultValue) {
    const char* val = std::getenv(name);
    if (val && *val) {
        try {
            return std::stoi(val);
        } catch (...) {
            return defaultValue;
        }
    }
    return defaultValue;
}

static bool getEnvBoolOrDefault(const char* name, bool defaultValue) {
    const char* val = std::getenv(name);
    if (val && *val) {
        std::string s(val);
        return s == "true" || s == "1" || s == "yes" || s == "TRUE";
    }
    return defaultValue;
}

std::vector<AIProviderPreset> getAIProviderPresets() {
    return {
        {
            "gemini",
            "Google Gemini (Free Tier)",
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            "gemini-2.0-flash",
            {"gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"},
            true,
            "Fast, capable Google Gemini models with high free rate limits via Google AI Studio.",
            "Get free key from aistudio.google.com"
        },
        {
            "openrouter",
            "OpenRouter (Free Catalog)",
            "https://openrouter.ai/api/v1/chat/completions",
            "google/gemini-2.0-flash-exp:free",
            {
                "google/gemini-2.0-flash-exp:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "deepseek/deepseek-r1:free",
                "mistralai/mistral-7b-instruct:free",
                "qwen/qwen-2.5-coder-32b-instruct:free"
            },
            true,
            "Access leading open-weights models tagged with ':free' with a single OpenRouter key.",
            "Get free key from openrouter.ai"
        },
        {
            "nvidia",
            "NVIDIA NIM (Free Credits)",
            "https://integrate.api.nvidia.com/v1/chat/completions",
            "meta/llama-3.3-70b-instruct",
            {
                "meta/llama-3.3-70b-instruct",
                "mistralai/mistral-large-2-instruct",
                "nvidia/llama-3.1-nemotron-70b-instruct",
                "deepseek-ai/deepseek-r1"
            },
            true,
            "High-throughput NVIDIA inference microservices with developer free tier credits.",
            "Get free inference key from build.nvidia.com"
        },
        {
            "ollama",
            "Ollama (Local / Zero Key Required)",
            "http://localhost:11434/v1/chat/completions",
            "llama3.2",
            {
                "llama3.2",
                "codellama",
                "deepseek-coder",
                "qwen2.5-coder",
                "mistral",
                "llama3.1"
            },
            false,
            "Run open LLMs locally on your own machine. 100% private, offline, and free.",
            "No API key needed. Run 'ollama run <model>' locally."
        },
        {
            "groq",
            "Groq Cloud (Fast Free Tier)",
            "https://api.groq.com/openai/v1/chat/completions",
            "llama-3.3-70b-versatile",
            {"llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"},
            true,
            "Ultra-low latency LPU inference with generous free daily limits.",
            "Get free key from console.groq.com"
        },
        {
            "custom",
            "Custom OpenAI-Compatible (LM Studio / vLLM)",
            "http://localhost:1234/v1/chat/completions",
            "local-model",
            {"local-model"},
            false,
            "Connect to any local or remote OpenAI-compatible server (LM Studio, LocalAI, vLLM).",
            "Optional API key depending on your server."
        },
        {
            "mock",
            "Mock Engine (Offline Heuristics)",
            "",
            "mock-rules-v1",
            {"mock-rules-v1"},
            false,
            "Zero dependencies, zero network requests, instant offline command generation.",
            "No key required."
        }
    };
}

ServerConfig ServerConfig::loadFromEnv() {
    ServerConfig cfg;
    cfg.host = getEnvOrDefault("COMMANDFORGE_HOST", "0.0.0.0");
    cfg.port = getEnvIntOrDefault("COMMANDFORGE_PORT", 8080);
    cfg.db_path = getEnvOrDefault("COMMANDFORGE_DB_PATH", "commandforge.db");
    cfg.log_level = getEnvOrDefault("COMMANDFORGE_LOG_LEVEL", "info");

    cfg.ai_provider = getEnvOrDefault("COMMANDFORGE_AI_PROVIDER", "mock");

    // Check specific provider key fallbacks
    std::string key = getEnvOrDefault("COMMANDFORGE_AI_API_KEY", "");
    if (key.empty()) {
        if (cfg.ai_provider == "gemini") {
            key = getEnvOrDefault("GEMINI_API_KEY", "");
        } else if (cfg.ai_provider == "openrouter") {
            key = getEnvOrDefault("OPENROUTER_API_KEY", "");
        } else if (cfg.ai_provider == "nvidia") {
            key = getEnvOrDefault("NVIDIA_API_KEY", "");
        } else if (cfg.ai_provider == "groq") {
            key = getEnvOrDefault("GROQ_API_KEY", "");
        } else if (cfg.ai_provider == "openai") {
            key = getEnvOrDefault("OPENAI_API_KEY", "");
        }
    }
    cfg.ai_api_key = key;

    // Default URLs and models according to provider preset if not explicitly overridden
    if (cfg.ai_provider == "gemini") {
        cfg.ai_api_url = getEnvOrDefault("COMMANDFORGE_AI_API_URL", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
        cfg.ai_model = getEnvOrDefault("COMMANDFORGE_AI_MODEL", "gemini-2.0-flash");
    } else if (cfg.ai_provider == "openrouter") {
        cfg.ai_api_url = getEnvOrDefault("COMMANDFORGE_AI_API_URL", "https://openrouter.ai/api/v1/chat/completions");
        cfg.ai_model = getEnvOrDefault("COMMANDFORGE_AI_MODEL", "google/gemini-2.0-flash-exp:free");
    } else if (cfg.ai_provider == "nvidia") {
        cfg.ai_api_url = getEnvOrDefault("COMMANDFORGE_AI_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions");
        cfg.ai_model = getEnvOrDefault("COMMANDFORGE_AI_MODEL", "meta/llama-3.3-70b-instruct");
    } else if (cfg.ai_provider == "ollama") {
        cfg.ai_api_url = getEnvOrDefault("COMMANDFORGE_AI_API_URL", "http://localhost:11434/v1/chat/completions");
        cfg.ai_model = getEnvOrDefault("COMMANDFORGE_AI_MODEL", "llama3.2");
    } else if (cfg.ai_provider == "groq") {
        cfg.ai_api_url = getEnvOrDefault("COMMANDFORGE_AI_API_URL", "https://api.groq.com/openai/v1/chat/completions");
        cfg.ai_model = getEnvOrDefault("COMMANDFORGE_AI_MODEL", "llama-3.3-70b-versatile");
    } else {
        cfg.ai_api_url = getEnvOrDefault("COMMANDFORGE_AI_API_URL", "https://api.openai.com/v1/chat/completions");
        cfg.ai_model = getEnvOrDefault("COMMANDFORGE_AI_MODEL", "gpt-4o-mini");
    }

    cfg.execution_adapter = getEnvOrDefault("COMMANDFORGE_EXECUTION_ADAPTER", "docker");
    cfg.docker_image = getEnvOrDefault("COMMANDFORGE_DOCKER_IMAGE", "commandforge-sandbox:latest");
    cfg.execution_timeout_seconds = getEnvIntOrDefault("COMMANDFORGE_EXECUTION_TIMEOUT_SECONDS", 10);
    cfg.max_output_bytes = getEnvIntOrDefault("COMMANDFORGE_MAX_OUTPUT_BYTES", 65536);
    cfg.isolation_network_enabled = getEnvBoolOrDefault("COMMANDFORGE_ISOLATION_NETWORK_ENABLED", false);
    cfg.workspace_dir = getEnvOrDefault("COMMANDFORGE_WORKSPACE_DIR", "/tmp/commandforge_sandbox");
    cfg.history_retention_days = getEnvIntOrDefault("COMMANDFORGE_HISTORY_RETENTION_DAYS", 30);
    cfg.monitoring_interval_ms = getEnvIntOrDefault("COMMANDFORGE_MONITORING_INTERVAL_MS", 3000);

    return cfg;
}

} // namespace commandforge
