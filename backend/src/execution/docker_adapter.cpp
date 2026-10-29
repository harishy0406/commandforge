#include "commandforge/execution/docker_adapter.hpp"
#include "commandforge/common/logger.hpp"
#include <chrono>
#include <thread>
#include <sstream>
#include <fstream>
#include <array>
#include <cstdio>
#include <cstdlib>

#if defined(_WIN32) || defined(_WIN64)
#include <windows.h>
#else
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <signal.h>
#include <fcntl.h>
#endif

namespace commandforge {

DockerAdapter::DockerAdapter(std::string image, std::string workspace_dir, int max_output_bytes)
    : image_(std::move(image)),
      workspace_dir_(std::move(workspace_dir)),
      max_output_bytes_(max_output_bytes) {}

bool DockerAdapter::checkDockerAvailable() const {
#if defined(_WIN32) || defined(_WIN64)
    int code = std::system("docker --version > nul 2>&1");
#else
    int code = std::system("docker --version > /dev/null 2>&1");
#endif
    return (code == 0);
}

static std::string escapeShellArg(const std::string& input) {
    std::string out = "'";
    for (char c : input) {
        if (c == '\'') {
            out += "'\\''";
        } else {
            out += c;
        }
    }
    out += "'";
    return out;
}

ExecutionResult DockerAdapter::execute(const std::string& executionId,
                                      const std::string& command,
                                      int timeoutSeconds,
                                      std::atomic<bool>& cancelFlag) {
    ExecutionResult result;
    result.id = executionId;
    result.environment = "docker-sandbox (" + image_ + ")";

    auto startTime = std::chrono::steady_clock::now();

    if (!checkDockerAvailable()) {
        result.status = ExecutionStatus::Failed;
        result.exit_code = 127;
        result.stderr_output = "Execution Error: Docker engine is not available on host. CommandForge requires a running Docker daemon to enforce container isolation and prevent host modification.";
        result.duration_ms = 0;
        return result;
    }

    std::string containerName = "cf-sandbox-" + executionId.substr(0, 8);

    // Docker execution with strict security parameters
    std::ostringstream cmdStream;
    cmdStream << "docker run --name " << containerName
              << " --rm"
              << " --network none"
              << " --cap-drop=ALL"
              << " --user 10001:10001"
              << " --memory=256m"
              << " --cpus=0.5"
              << " --pids-limit=64"
              << " " << image_
              << " /bin/bash -c " << escapeShellArg(command);

    std::string fullDockerCmd = cmdStream.str();
    LOG_INFO("DockerAdapter", "Launching isolated execution [" + executionId + "]: " + fullDockerCmd);

#if defined(_WIN32) || defined(_WIN64)
    // On Windows host, invoke docker run via cmd.exe with redirection or pipes
    fullDockerCmd += " 2>&1";
    FILE* pipe = _popen(fullDockerCmd.c_str(), "r");
    if (!pipe) {
        result.status = ExecutionStatus::Failed;
        result.exit_code = -1;
        result.stderr_output = "Failed to launch Docker process.";
        return result;
    }

    std::string output;
    char buffer[1024];
    bool timedOut = false;

    while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
        if (cancelFlag.load()) {
            std::system(("docker kill " + containerName + " > nul 2>&1").c_str());
            result.status = ExecutionStatus::Cancelled;
            result.stderr_output = "Execution cancelled by user.";
            _pclose(pipe);
            return result;
        }

        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() - startTime).count();
        if (elapsed > timeoutSeconds) {
            timedOut = true;
            std::system(("docker kill " + containerName + " > nul 2>&1").c_str());
            break;
        }

        if (output.size() < static_cast<size_t>(max_output_bytes_)) {
            output.append(buffer);
        } else {
            result.output_truncated = true;
        }
    }

    int exitStatus = _pclose(pipe);
#else
    // POSIX environment
    fullDockerCmd += " 2>&1";
    FILE* pipe = popen(fullDockerCmd.c_str(), "r");
    if (!pipe) {
        result.status = ExecutionStatus::Failed;
        result.exit_code = -1;
        result.stderr_output = "Failed to spawn container execution pipeline.";
        return result;
    }

    std::string output;
    char buffer[1024];
    bool timedOut = false;

    while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
        if (cancelFlag.load()) {
            std::system(("docker kill " + containerName + " > /dev/null 2>&1").c_str());
            result.status = ExecutionStatus::Cancelled;
            result.stderr_output = "Execution was explicitly cancelled by user.";
            pclose(pipe);
            return result;
        }

        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() - startTime).count();
        if (elapsed > timeoutSeconds) {
            timedOut = true;
            std::system(("docker kill " + containerName + " > /dev/null 2>&1").c_str());
            break;
        }

        if (output.size() < static_cast<size_t>(max_output_bytes_)) {
            output.append(buffer);
        } else {
            result.output_truncated = true;
        }
    }

    int exitStatus = pclose(pipe);
#endif

    auto endTime = std::chrono::steady_clock::now();
    result.duration_ms = std::chrono::duration<double, std::milli>(endTime - startTime).count();

    if (timedOut) {
        result.status = ExecutionStatus::Timeout;
        result.exit_code = 124;
        result.stderr_output = "Execution timed out after " + std::to_string(timeoutSeconds) + " seconds.";
        result.stdout_output = output;
    } else {
        result.exit_code = exitStatus;
        if (exitStatus == 0) {
            result.status = ExecutionStatus::Success;
            result.stdout_output = output;
        } else {
            result.status = ExecutionStatus::Failed;
            result.stderr_output = output;
        }
    }

    return result;
}

} // namespace commandforge
