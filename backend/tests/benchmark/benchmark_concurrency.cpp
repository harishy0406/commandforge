#include <iostream>
#include <vector>
#include <thread>
#include <chrono>
#include <atomic>
#include <memory>
#include "commandforge/commands/risk_analyzer.hpp"
#include "commandforge/ai/mock_provider.hpp"
#include "commandforge/execution/execution_policy.hpp"

using namespace commandforge;

int main() {
    std::cout << "==========================================================" << std::endl;
    std::cout << "CommandForge Concurrency & Validation Engine Benchmark" << std::endl;
    std::cout << "Notice: Benchmark tests memory throughput and AST policy checks." << std::endl;
    std::cout << "Distinguish raw synthetic benchmarks from isolated container runtimes." << std::endl;
    std::cout << "==========================================================" << std::endl;

    RiskAnalyzer analyzer;
    MockProvider provider;
    ExecutionPolicy policy(analyzer);

    const int TOTAL_REQUESTS = 10000;
    const int NUM_THREADS = 8;
    const int PER_THREAD = TOTAL_REQUESTS / NUM_THREADS;

    std::vector<std::string> samplePrompts = {
        "Find the largest files",
        "Show open ports",
        "Inspect memory usage",
        "Clean old logs",
        "rm -rf / --no-preserve-root"
    };

    std::atomic<int> completed{0};
    std::atomic<int> violationsBlocked{0};

    auto start = std::chrono::steady_clock::now();

    std::vector<std::thread> workers;
    for (int t = 0; t < NUM_THREADS; ++t) {
        workers.emplace_back([&, t]() {
            for (int i = 0; i < PER_THREAD; ++i) {
                const auto& prompt = samplePrompts[(t + i) % samplePrompts.size()];
                GeneratedCommand cmd = provider.generateCommand(prompt);

                ExecutionRequest req;
                req.command = cmd.command;
                req.prompt = prompt;
                req.risk_level = cmd.risk_level;
                req.user_approved = true;

                std::string rejectReason;
                bool allowed = policy.evaluate(req, rejectReason);
                if (!allowed) {
                    violationsBlocked++;
                }
                completed++;
            }
        });
    }

    for (auto& w : workers) {
        w.join();
    }

    auto end = std::chrono::steady_clock::now();
    double totalMs = std::chrono::duration<double, std::milli>(end - start).count();
    double opsPerSec = (completed.load() / (totalMs / 1000.0));
    double avgLatencyUs = (totalMs * 1000.0) / completed.load();

    std::cout << "Results:" << std::endl;
    std::cout << "  Total operations completed: " << completed.load() << std::endl;
    std::cout << "  Prohibited violations caught: " << violationsBlocked.load() << std::endl;
    std::cout << "  Total Elapsed Time: " << totalMs << " ms" << std::endl;
    std::cout << "  Throughput: " << static_cast<uint64_t>(opsPerSec) << " ops/sec" << std::endl;
    std::cout << "  Average latency per command assessment: " << avgLatencyUs << " microseconds" << std::endl;
    std::cout << "==========================================================" << std::endl;

    return 0;
}
