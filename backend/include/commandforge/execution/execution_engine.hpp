#pragma once

#include "commandforge/common/types.hpp"
#include "commandforge/execution/execution_policy.hpp"
#include "commandforge/execution/docker_adapter.hpp"
#include "commandforge/storage/history_repository.hpp"
#include <memory>
#include <mutex>
#include <unordered_map>
#include <atomic>

namespace commandforge {

class ExecutionEngine {
public:
    ExecutionEngine(std::shared_ptr<IHistoryRepository> repository,
                    ExecutionPolicy policy,
                    DockerAdapter docker_adapter);
    ~ExecutionEngine() = default;

    ExecutionResult execute(const ExecutionRequest& request);
    bool cancelExecution(const std::string& executionId);
    bool isDockerAvailable() const;

private:
    std::shared_ptr<IHistoryRepository> repository_;
    ExecutionPolicy policy_;
    DockerAdapter docker_adapter_;

    std::mutex mutex_;
    std::unordered_map<std::string, std::shared_ptr<std::atomic<bool>>> active_executions_;

    std::string generateUuid();
    std::string currentTimestamp();
};

} // namespace commandforge
