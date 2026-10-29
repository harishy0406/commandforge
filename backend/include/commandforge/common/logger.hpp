#pragma once

#include <string>
#include <iostream>
#include <mutex>
#include <chrono>
#include <sstream>
#include <iomanip>

namespace commandforge {

enum class LogLevel {
    Debug,
    Info,
    Warning,
    Error,
    Security
};

class Logger {
public:
    static Logger& instance() {
        static Logger inst;
        return inst;
    }

    void setLevel(LogLevel level) {
        level_ = level;
    }

    void log(LogLevel level, const std::string& component, const std::string& message) {
        if (level < level_) return;

        std::lock_guard<std::mutex> lock(mutex_);
        auto now = std::chrono::system_clock::now();
        auto time_t_val = std::chrono::system_clock::to_time_t(now);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;

        std::tm tm_buf;
#if defined(_WIN32) || defined(_WIN64)
        localtime_s(&tm_buf, &time_t_val);
#else
        localtime_r(&time_t_val, &tm_buf);
#endif

        std::cout << "[" << std::put_time(&tm_buf, "%Y-%m-%d %H:%M:%S")
                  << "." << std::setfill('0') << std::setw(3) << ms.count() << "] "
                  << "[" << levelToString(level) << "] "
                  << "[" << component << "] "
                  << message << std::endl;
    }

    void debug(const std::string& comp, const std::string& msg) { log(LogLevel::Debug, comp, msg); }
    void info(const std::string& comp, const std::string& msg) { log(LogLevel::Info, comp, msg); }
    void warn(const std::string& comp, const std::string& msg) { log(LogLevel::Warning, comp, msg); }
    void error(const std::string& comp, const std::string& msg) { log(LogLevel::Error, comp, msg); }
    void security(const std::string& comp, const std::string& msg) { log(LogLevel::Security, comp, msg); }

private:
    Logger() : level_(LogLevel::Info) {}
    LogLevel level_;
    std::mutex mutex_;

    static const char* levelToString(LogLevel level) {
        switch (level) {
            case LogLevel::Debug: return "DEBUG";
            case LogLevel::Info: return "INFO";
            case LogLevel::Warning: return "WARN";
            case LogLevel::Error: return "ERROR";
            case LogLevel::Security: return "SECURITY_ALERT";
        }
        return "UNKNOWN";
    }
};

#define LOG_DEBUG(comp, msg) commandforge::Logger::instance().debug(comp, msg)
#define LOG_INFO(comp, msg) commandforge::Logger::instance().info(comp, msg)
#define LOG_WARN(comp, msg) commandforge::Logger::instance().warn(comp, msg)
#define LOG_ERROR(comp, msg) commandforge::Logger::instance().error(comp, msg)
#define LOG_SECURITY(comp, msg) commandforge::Logger::instance().security(comp, msg)

} // namespace commandforge
