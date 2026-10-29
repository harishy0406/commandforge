#include "commandforge/execution/execution_engine.hpp"
#include "commandforge/common/logger.hpp"
#include <random>
#include <sstream>
#include <iomanip>
#include <chrono>

namespace commandforge {

ExecutionEngine::ExecutionEngine(std::shared_ptr<IHistoryRepository> repository,
                                 ExecutionPolicy policy,
                                 DockerAdapter docker_adapter)
    : repository_(std::move(repository)),
      policy_(std::move(policy)),
      docker_adapter_(std::move(docker_adapter)) {}

std::string ExecutionEngine::generateUuid() {
    static std::random_device rd;
    static std::mt19937_64 gen(rd());
    static std::uniform_int_distribution<uint64_t> dis;

    uint64_t part1 = dis(gen);
    uint64_t part2 = dis(gen);

    std::ostringstream ss;
    ss << std::hex << std::setfill('0')
       << std::setw(16) << part1
       << std::setw(16) << part2;
    return ss.str();
}

std::string ExecutionEngine::currentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::tm buf;
#if defined(_WIN32) || defined(_WIN64)
    localtime_s(&buf, &in_time_t);
#else
    localtime_r(&in_time_t, &buf);
#endif
    std::ostringstream ss;
    ss << std::put_time(&buf, "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

ExecutionResult ExecutionEngine::execute(const ExecutionRequest& request) {
    std::string execId = generateUuid();
    std::string timestamp = currentTimestamp();

    // 1. Policy Evaluation
    std::string rejectReason;
    if (!policy_.evaluate(request, rejectReason)) {
        LOG_SECURITY("ExecutionEngine", "Blocked execution: " + request.command + " - Reason: " + rejectReason);
        ExecutionResult rejectedRes;
        rejectedRes.id = execId;
        rejectedRes.status = ExecutionStatus::Rejected;
        rejectedRes.exit_code = 126;
        rejectedRes.stderr_output = rejectReason;
        rejectedRes.executed_at = timestamp;
        rejectedRes.environment = "policy-engine";

        // Save audit entry
        CommandRecord rec;
        rec.id = execId;
        rec.prompt = request.prompt;
        rec.command = request.command;
        rec.explanation = "Rejected by CommandForge Security Policy";
        rec.risk_level = riskLevelToString(request.risk_level);
        rec.status = "rejected";
        rec.exit_code = 126;
        rec.stderr_output = rejectReason;
        rec.duration_ms = 0;
        rec.created_at = timestamp;
        if (repository_) {
            repository_->saveExecution(rec);
        }
        return rejectedRes;
    }

    // 2. Track execution for cancellation
    auto cancelFlag = std::make_shared<std::atomic<bool>>(false);
    {
        std::lock_guard<std::mutex> lock(mutex_);
        active_executions_[execId] = cancelFlag;
    }

    // 3. Perform execution in isolated container
    ExecutionResult result = docker_adapter_.execute(execId, request.command, request.timeout_seconds, *cancelFlag);
    result.executed_at = timestamp;

    // Clean up active tracker
    {
        std::lock_guard<std::mutex> lock(mutex_);
        active_executions_.erase(execId);
    }

    // 4. Save to repository
    CommandRecord record;
    record.id = execId;
    record.prompt = request.prompt;
    record.command = request.command;
    record.explanation = "Executed in isolated Docker container";
    record.risk_level = riskLevelToString(request.risk_level);
    record.status = executionStatusToString(result.status);
    record.exit_code = result.exit_code;
    record.stdout_output = result.stdout_output;
    record.stderr_output = result.stderr_output;
    record.duration_ms = result.duration_ms;
    record.created_at = timestamp;

    if (repository_) {
        repository_->saveExecution(record);
    }

    return result;
}

bool ExecutionEngine::cancelExecution(const std::string& executionId) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = active_executions_.find(executionId);
    if (it != active_executions_.end()) {
        it->second->store(true);
        LOG_INFO("ExecutionEngine", "Signal sent to cancel execution [" + executionId + "]");
        return true;
    }
    return false;
}

} // namespace commandforge
