#pragma once

#include "commandforge/common/types.hpp"
#include <string>
#include <atomic>
#include <memory>

namespace commandforge {

class DockerAdapter {
public:
    DockerAdapter(std::string image, std::string workspace_dir, int max_output_bytes);
    ~DockerAdapter() = default;

    ExecutionResult execute(const std::string& executionId,
                           const std::string& command,
                           int timeoutSeconds,
                           std::atomic<bool>& cancelFlag);

    bool checkDockerAvailable() const;

private:
    std::string image_;
    std::string workspace_dir_;
    int max_output_bytes_;
};

} // namespace commandforge
