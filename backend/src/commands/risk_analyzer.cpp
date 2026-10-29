#include "commandforge/commands/risk_analyzer.hpp"
#include <algorithm>
#include <sstream>

namespace commandforge {

RiskAnalyzer::RiskAnalyzer() {
    initializeRules();
}

void RiskAnalyzer::initializeRules() {
    // Critical Blocked Rules (Immediate Rejection)
    rules_.push_back({
        std::regex(R"(rm\s+(-[a-zA-Z]*r[a-zA-Z]*f*|-rf|-fr)\s+([~/]|\.\.|\*|/\*))", std::regex_constants::icase),
        "Catastrophic root or system wildcard deletion prohibited.",
        RiskLevel::High,
        true
    });

    rules_.push_back({
        std::regex(R"((:\(\)\s*\{\s*:\|:&\s*\};:|(\w+)\(\)\s*\{[^\}]*\|[^\}]*&))", std::regex_constants::icase),
        "Fork bomb pattern detected: potential denial-of-service.",
        RiskLevel::High,
        true
    });

    rules_.push_back({
        std::regex(R"((mkfs(\.[a-z0-9]+)?|fdisk|dd\s+if=.*of=\/dev\/(sd[a-z]|nvme[0-9]|hd[a-z]|vd[a-z])))", std::regex_constants::icase),
        "Raw disk partition write or filesystem reformat prohibited.",
        RiskLevel::High,
        true
    });

    rules_.push_back({
        std::regex(R"((\/dev\/(mem|kmem|port)|kcore))", std::regex_constants::icase),
        "Direct kernel memory or physical hardware device access prohibited.",
        RiskLevel::High,
        true
    });

    rules_.push_back({
        std::regex(R"(169\.254\.169\.254)", std::regex_constants::icase),
        "Cloud instance metadata service probing prohibited.",
        RiskLevel::High,
        true
    });

    rules_.push_back({
        std::regex(R"((base64\s+(-d|--decode)\s*\|\s*(sh|bash|zsh)))", std::regex_constants::icase),
        "Obfuscated encoded shell pipe execution prohibited.",
        RiskLevel::High,
        true
    });

    rules_.push_back({
        std::regex(R"((sudo|su\s+-|chroot|setuid))", std::regex_constants::icase),
        "Privilege escalation commands (sudo/su) prohibited in container sandbox.",
        RiskLevel::High,
        true
    });

    rules_.push_back({
        std::regex(R"(\/etc\/(shadow|gshadow|passwd))", std::regex_constants::icase),
        "Access to sensitive authentication databases prohibited.",
        RiskLevel::High,
        true
    });

    // High Risk Rules (Allowed with strict user confirmation)
    rules_.push_back({
        std::regex(R"(rm\s+-[a-zA-Z]*r)", std::regex_constants::icase),
        "Recursive directory removal will permanently erase targeted paths.",
        RiskLevel::High,
        false
    });

    rules_.push_back({
        std::regex(R"((iptables|ufw|nftables|route\s+del))", std::regex_constants::icase),
        "Host firewall or routing table modification detected.",
        RiskLevel::High,
        false
    });

    rules_.push_back({
        std::regex(R"((kill\s+-9|killall|pkill))", std::regex_constants::icase),
        "Forced termination of active processes may cause state or data loss.",
        RiskLevel::High,
        false
    });

    // Medium Risk Rules (Modifies files, writes or alters environment)
    rules_.push_back({
        std::regex(R"((>|>>|\bmv\b|\bcp\b|\brm\b|\bchmod\b|\bchown\b|\btar\s+-[a-zA-Z]*x))", std::regex_constants::icase),
        "Command modifies or deletes files, directories, or permissions on the filesystem.",
        RiskLevel::Medium,
        false
    });

    rules_.push_back({
        std::regex(R"((curl|wget)\s+.*\|\s*(bash|sh))", std::regex_constants::icase),
        "Piping external remote scripts directly into a shell interpreter carries supply-chain risk.",
        RiskLevel::Medium,
        false
    });

    rules_.push_back({
        std::regex(R"((export|unset|sed\s+-i))", std::regex_constants::icase),
        "In-place file editing or environment variable manipulation.",
        RiskLevel::Medium,
        false
    });
}

ValidationResult RiskAnalyzer::validate(const std::string& command) const {
    ValidationResult res;
    res.is_valid = true;
    res.is_allowed = true;
    res.risk_level = RiskLevel::Low;

    if (command.empty()) {
        res.is_valid = false;
        res.is_allowed = false;
        res.blocked_reasons.push_back("Command string cannot be empty.");
        return res;
    }

    if (command.length() > 4096) {
        res.is_valid = false;
        res.is_allowed = false;
        res.blocked_reasons.push_back("Command length exceeds maximum security threshold (4096 chars).");
        return res;
    }

    for (const auto& rule : rules_) {
        if (std::regex_search(command, rule.pattern)) {
            if (rule.is_blocked) {
                res.is_allowed = false;
                res.is_valid = false;
                res.risk_level = RiskLevel::High;
                res.blocked_reasons.push_back(rule.warning);
            } else {
                res.warnings.push_back(rule.warning);
                if (rule.risk == RiskLevel::High && res.risk_level != RiskLevel::High) {
                    res.risk_level = RiskLevel::High;
                } else if (rule.risk == RiskLevel::Medium && res.risk_level == RiskLevel::Low) {
                    res.risk_level = RiskLevel::Medium;
                }
            }
        }
    }

    return res;
}

RiskLevel RiskAnalyzer::assessRisk(const std::string& command, std::string& reasonOut, bool& isDestructiveOut) const {
    ValidationResult val = validate(command);
    isDestructiveOut = (val.risk_level == RiskLevel::High || !val.warnings.empty());

    if (!val.blocked_reasons.empty()) {
        reasonOut = val.blocked_reasons.front();
        return RiskLevel::High;
    }

    if (!val.warnings.empty()) {
        reasonOut = val.warnings.front();
        return val.risk_level;
    }

    reasonOut = "Standard read-only or inspection command; safe for sandbox execution.";
    return RiskLevel::Low;
}

} // namespace commandforge
