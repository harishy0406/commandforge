#pragma once

#include "commandforge/common/types.hpp"
#include <mutex>
#include <string>

namespace commandforge {

class SystemMonitor {
public:
    SystemMonitor();
    ~SystemMonitor() = default;

    SystemMetrics getMetrics();

private:
    std::mutex mutex_;
    uint64_t last_total_time_{0};
    uint64_t last_idle_time_{0};

    double sampleCpuUsage();
    void sampleMemory(double& usedMb, double& totalMb, double& pct);
    void sampleDisk(double& usedGb, double& totalGb, double& pct);
    int sampleActiveProcesses();
    std::string currentTimestamp();
};

} // namespace commandforge
