#include "commandforge/execution/docker_adapter.hpp"
#include "commandforge/common/logger.hpp"
#include <chrono>
#include <thread>
#include <sstream>
#include <fstream>
#include <vector>
#include <cstdio>
#include <cstdlib>
#include <algorithm>

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
    int code = std::system("docker info > nul 2>&1");
#else
    int code = std::system("docker info > /dev/null 2>&1");
#endif
    return (code == 0);
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
        result.stderr_output = "Execution Error: Docker engine daemon is not running or unreachable. CommandForge strictly isolates all commands inside containers and refuses to run un-isolated commands directly on the host. Please start Docker Desktop/daemon and try again.";
        result.duration_ms = 0;
        return result;
    }

    std::string containerName = "cf-sandbox-" + executionId.substr(0, std::min<size_t>(8, executionId.size()));

#if defined(_WIN32) || defined(_WIN64)
    SECURITY_ATTRIBUTES sa;
    sa.nLength = sizeof(SECURITY_ATTRIBUTES);
    sa.bInheritHandle = TRUE;
    sa.lpSecurityDescriptor = NULL;

    HANDLE hStdOutRead = NULL, hStdOutWrite = NULL;
    HANDLE hStdInRead = NULL, hStdInWrite = NULL;

    if (!CreatePipe(&hStdOutRead, &hStdOutWrite, &sa, 0)) {
        result.status = ExecutionStatus::Failed;
        result.exit_code = -1;
        result.stderr_output = "Internal Error: Failed to create stdout pipe.";
        return result;
    }
    SetHandleInformation(hStdOutRead, HANDLE_FLAG_INHERIT, 0);

    if (!CreatePipe(&hStdInRead, &hStdInWrite, &sa, 0)) {
        CloseHandle(hStdOutRead);
        CloseHandle(hStdOutWrite);
        result.status = ExecutionStatus::Failed;
        result.exit_code = -1;
        result.stderr_output = "Internal Error: Failed to create stdin pipe.";
        return result;
    }
    SetHandleInformation(hStdInWrite, HANDLE_FLAG_INHERIT, 0);

    STARTUPINFOA si;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdInput = hStdInRead;
    si.hStdOutput = hStdOutWrite;
    si.hStdError = hStdOutWrite;

    PROCESS_INFORMATION pi;
    ZeroMemory(&pi, sizeof(pi));

    std::string cmdLine = "docker run -i --name " + containerName
                        + " --rm"
                        + " --network none"
                        + " --cap-drop=ALL"
                        + " --user 10001:10001"
                        + " --memory=256m"
                        + " --cpus=0.5"
                        + " --pids-limit=64"
                        + " " + image_
                        + " /bin/bash";

    LOG_INFO("DockerAdapter", "Launching isolated container execution [" + executionId + "]");

    std::vector<char> cmdBuf(cmdLine.begin(), cmdLine.end());
    cmdBuf.push_back('\0');

    BOOL success = CreateProcessA(
        NULL,
        cmdBuf.data(),
        NULL,
        NULL,
        TRUE,
        CREATE_NO_WINDOW,
        NULL,
        NULL,
        &si,
        &pi
    );

    // Parent closes the child's ends of the pipes
    CloseHandle(hStdOutWrite);
    CloseHandle(hStdInRead);

    if (!success) {
        CloseHandle(hStdOutRead);
        CloseHandle(hStdInWrite);
        result.status = ExecutionStatus::Failed;
        result.exit_code = -1;
        result.stderr_output = "Internal Error: Failed to launch Docker container process.";
        return result;
    }

    // Write command script into container stdin
    std::string inputScript = command + "\nexit $?\n";
    DWORD bytesWritten = 0;
    WriteFile(hStdInWrite, inputScript.c_str(), static_cast<DWORD>(inputScript.size()), &bytesWritten, NULL);
    CloseHandle(hStdInWrite);

    std::string output;
    bool timedOut = false;
    bool wasCancelled = false;

    while (true) {
        if (cancelFlag.load()) {
            wasCancelled = true;
            std::system(("docker kill " + containerName + " > nul 2>&1").c_str());
            TerminateProcess(pi.hProcess, 130);
            break;
        }

        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::steady_clock::now() - startTime).count();
        if (elapsed >= timeoutSeconds) {
            timedOut = true;
            std::system(("docker kill " + containerName + " > nul 2>&1").c_str());
            TerminateProcess(pi.hProcess, 124);
            break;
        }

        DWORD waitRes = WaitForSingleObject(pi.hProcess, 50);

        DWORD bytesAvail = 0;
        if (PeekNamedPipe(hStdOutRead, NULL, 0, NULL, &bytesAvail, NULL) && bytesAvail > 0) {
            char buf[1024];
            DWORD toRead = (bytesAvail < sizeof(buf) - 1) ? bytesAvail : static_cast<DWORD>(sizeof(buf) - 1);
            DWORD readCount = 0;
            if (ReadFile(hStdOutRead, buf, toRead, &readCount, NULL) && readCount > 0) {
                if (output.size() < static_cast<size_t>(max_output_bytes_)) {
                    output.append(buf, readCount);
                } else {
                    result.output_truncated = true;
                }
            }
        }

        if (waitRes == WAIT_OBJECT_0) {
            // Process completed, drain pipe
            while (true) {
                DWORD leftAvail = 0;
                if (!PeekNamedPipe(hStdOutRead, NULL, 0, NULL, &leftAvail, NULL) || leftAvail == 0) {
                    break;
                }
                char buf[1024];
                DWORD toRead = (leftAvail < sizeof(buf) - 1) ? leftAvail : static_cast<DWORD>(sizeof(buf) - 1);
                DWORD readCount = 0;
                if (ReadFile(hStdOutRead, buf, toRead, &readCount, NULL) && readCount > 0) {
                    if (output.size() < static_cast<size_t>(max_output_bytes_)) {
                        output.append(buf, readCount);
                    } else {
                        result.output_truncated = true;
                    }
                }
            }
            break;
        }
    }

    DWORD dwExit = 0;
    GetExitCodeProcess(pi.hProcess, &dwExit);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    CloseHandle(hStdOutRead);

    int exitStatus = static_cast<int>(dwExit);
#else
    int inPipe[2];
    int outPipe[2];
    if (pipe(inPipe) < 0 || pipe(outPipe) < 0) {
        result.status = ExecutionStatus::Failed;
        result.exit_code = -1;
        result.stderr_output = "Failed to create IPC pipes.";
        return result;
    }

    LOG_INFO("DockerAdapter", "Launching isolated container execution [" + executionId + "]");

    pid_t pid = fork();
    if (pid < 0) {
        close(inPipe[0]); close(inPipe[1]);
        close(outPipe[0]); close(outPipe[1]);
        result.status = ExecutionStatus::Failed;
        result.exit_code = -1;
        result.stderr_output = "Failed to fork container process.";
        return result;
    }

    if (pid == 0) {
        dup2(inPipe[0], STDIN_FILENO);
        dup2(outPipe[1], STDOUT_FILENO);
        dup2(outPipe[1], STDERR_FILENO);

        close(inPipe[0]); close(inPipe[1]);
        close(outPipe[0]); close(outPipe[1]);

        char* const argv[] = {
            (char*)"docker", (char*)"run", (char*)"-i",
            (char*)"--name", (char*)containerName.c_str(),
            (char*)"--rm",
            (char*)"--network", (char*)"none",
            (char*)"--cap-drop=ALL",
            (char*)"--user", (char*)"10001:10001",
            (char*)"--memory=256m",
            (char*)"--cpus=0.5",
            (char*)"--pids-limit=64",
            (char*)image_.c_str(),
            (char*)"/bin/bash",
            nullptr
        };
        execvp("docker", argv);
        _exit(127);
    }

    close(inPipe[0]);
    close(outPipe[1]);

    std::string inputScript = command + "\nexit $?\n";
    write(inPipe[1], inputScript.c_str(), inputScript.size());
    close(inPipe[1]);

    int flags = fcntl(outPipe[0], F_GETFL, 0);
    fcntl(outPipe[0], F_SETFL, flags | O_NONBLOCK);

    std::string output;
    bool timedOut = false;
    bool wasCancelled = false;
    int exitStatus = -1;

    while (true) {
        if (cancelFlag.load()) {
            wasCancelled = true;
            kill(pid, SIGKILL);
            std::system(("docker kill " + containerName + " > /dev/null 2>&1").c_str());
            break;
        }

        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::steady_clock::now() - startTime).count();
        if (elapsed >= timeoutSeconds) {
            timedOut = true;
            kill(pid, SIGKILL);
            std::system(("docker kill " + containerName + " > /dev/null 2>&1").c_str());
            break;
        }

        char buf[1024];
        ssize_t n = read(outPipe[0], buf, sizeof(buf) - 1);
        if (n > 0) {
            if (output.size() < static_cast<size_t>(max_output_bytes_)) {
                output.append(buf, n);
            } else {
                result.output_truncated = true;
            }
        }

        int status = 0;
        pid_t res = waitpid(pid, &status, WNOHANG);
        if (res == pid) {
            while ((n = read(outPipe[0], buf, sizeof(buf) - 1)) > 0) {
                if (output.size() < static_cast<size_t>(max_output_bytes_)) {
                    output.append(buf, n);
                } else {
                    result.output_truncated = true;
                }
            }
            if (WIFEXITED(status)) {
                exitStatus = WEXITSTATUS(status);
            } else if (WIFSIGNALED(status)) {
                exitStatus = 128 + WTERMSIG(status);
            }
            break;
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }

    close(outPipe[0]);
#endif

    auto endTime = std::chrono::steady_clock::now();
    result.duration_ms = std::chrono::duration<double, std::milli>(endTime - startTime).count();

    if (wasCancelled) {
        result.status = ExecutionStatus::Cancelled;
        result.exit_code = 130;
        result.stderr_output = "Execution was explicitly cancelled by user.";
        result.stdout_output = output;
    } else if (timedOut) {
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
