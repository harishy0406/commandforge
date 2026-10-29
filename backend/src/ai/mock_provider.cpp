#include "commandforge/ai/mock_provider.hpp"
#include <algorithm>
#include <cctype>

namespace commandforge {

static std::string toLower(std::string s) {
    std::transform(s.begin(), s.end(), s.begin(), [](unsigned char c){ return std::tolower(c); });
    return s;
}

MockProvider::MockProvider() {
    initializeCatalog();
}

void MockProvider::initializeCatalog() {
    preset_catalog_["largest files"] = {
        "du -ah . | sort -rh | head -n 10",
        "Calculates recursive disk usage for items in current directory, sorts in descending human-readable sizes, and limits output to the top 10.",
        {"find . -type f -exec du -Sh {} + | sort -rh | head -n 10", "ncdu ."}
    };

    preset_catalog_["ports"] = {
        "ss -tulpn",
        "Lists all listening TCP and UDP sockets along with numeric port addresses and owning process identifiers.",
        {"netstat -tulpn", "lsof -i -P -n | grep LISTEN"}
    };

    preset_catalog_["memory"] = {
        "free -h",
        "Displays total, used, free, shared, buffer/cache, and available system RAM and swap in human-readable units.",
        {"vmstat -s", "cat /proc/meminfo | head -n 15"}
    };

    preset_catalog_["cpu"] = {
        "top -b -n 1 | head -n 20",
        "Captures a single batch snapshot of system load averages, CPU task states, and top CPU-consuming processes.",
        {"ps aux --sort=-%cpu | head -n 10", "mpstat 1 1"}
    };

    preset_catalog_["disk"] = {
        "df -hT",
        "Reports filesystem disk space usage, mount points, and filesystem types in human-readable megabytes and gigabytes.",
        {"lsblk -f", "df -i"}
    };

    preset_catalog_["active processes"] = {
        "ps aux --sort=-%mem | head -n 15",
        "Displays all running processes on the system sorted by highest memory consumption.",
        {"top -o %MEM -b -n 1 | head -n 15", "pstree -pa"}
    };

    preset_catalog_["search text"] = {
        "grep -rnI \"TODO\" .",
        "Recursively searches current directory for the string 'TODO', printing line numbers and ignoring binary files.",
        {"ripgrep \"TODO\"", "find . -type f -exec grep -H \"TODO\" {} +"}
    };

    preset_catalog_["tar compress"] = {
        "tar -czvf archive.tar.gz ./data",
        "Creates a gzip-compressed archive named archive.tar.gz containing the contents of ./data directory.",
        {"zip -r archive.zip ./data", "tar -cjvf archive.tar.bz2 ./data"}
    };

    preset_catalog_["clean logs"] = {
        "find /var/log -type f -name \"*.log\" -mtime +14 -exec rm -f {} +",
        "Locates all files ending in .log under /var/log modified more than 14 days ago and deletes them.",
        {"journalctl --vacuum-time=14d", "logrotate -f /etc/logrotate.conf"}
    };

    preset_catalog_["delete root"] = {
        "rm -rf / --no-preserve-root",
        "Attempted catastrophic purge of entire root filesystem.",
        {"# Refused: Operation violates security boundaries"}
    };
}

GeneratedCommand MockProvider::generateCommand(const std::string& prompt, const std::string& /*context*/) {
    std::string lowerPrompt = toLower(prompt);
    GeneratedCommand cmd;

    // Check catalog matches
    for (const auto& [key, preset] : preset_catalog_) {
        if (lowerPrompt.find(key) != std::string::npos) {
            cmd.command = preset.command;
            cmd.explanation = preset.explanation;
            cmd.suggested_alternatives = preset.alternatives;
            break;
        }
    }

    // Dynamic heuristics if no direct match
    if (cmd.command.empty()) {
        if (lowerPrompt.find("docker") != std::string::npos) {
            cmd.command = "docker ps -a --format \"table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Names}}\"";
            cmd.explanation = "Lists all running and stopped Docker containers with formatted table columns.";
            cmd.suggested_alternatives = {"docker container ls", "docker stats --no-stream"};
        } else if (lowerPrompt.find("git") != std::string::npos) {
            cmd.command = "git log --oneline --graph --decorate -n 10";
            cmd.explanation = "Displays the recent 10 commits with a compact visual branch graph and commit hashes.";
            cmd.suggested_alternatives = {"git status -sb", "git diff --stat"};
        } else if (lowerPrompt.find("find") != std::string::npos && lowerPrompt.find("file") != std::string::npos) {
            cmd.command = "find . -type f -name \"*\" -mmin -60";
            cmd.explanation = "Searches for files modified within the last 60 minutes starting from the current directory.";
            cmd.suggested_alternatives = {"ls -lt | head -n 10", "find . -type f -size +100M"};
        } else if (lowerPrompt.find("kill") != std::string::npos || lowerPrompt.find("terminate") != std::string::npos) {
            cmd.command = "pkill -f process_name";
            cmd.explanation = "Sends termination signal to processes matching the specified pattern.";
            cmd.suggested_alternatives = {"kill -15 <PID>", "killall process_name"};
        } else {
            cmd.command = "echo \"[CommandForge] Task: " + prompt + "\" && uname -a && uptime";
            cmd.explanation = "Executes inspection utility displaying system kernel release, hostname, and current uptime.";
            cmd.suggested_alternatives = {"hostnamectl", "cat /etc/os-release"};
        }
    }

    // Assess risk
    cmd.risk_level = risk_analyzer_.assessRisk(cmd.command, cmd.risk_reason, cmd.potentially_destructive);
    cmd.requires_confirmation = (cmd.risk_level == RiskLevel::High || cmd.potentially_destructive);

    return cmd;
}

} // namespace commandforge
