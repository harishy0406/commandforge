#pragma once

#include "commandforge/common/types.hpp"
#include <string>
#include <vector>
#include <regex>

namespace commandforge {

class RiskAnalyzer {
public:
    RiskAnalyzer();
    ~RiskAnalyzer() = default;

    ValidationResult validate(const std::string& command) const;
    RiskLevel assessRisk(const std::string& command, std::string& reasonOut, bool& isDestructiveOut) const;

private:
    struct Rule {
        std::regex pattern;
        std::string warning;
        RiskLevel risk;
        bool is_blocked;
    };

    std::vector<Rule> rules_;
    void initializeRules();
};

} // namespace commandforge
