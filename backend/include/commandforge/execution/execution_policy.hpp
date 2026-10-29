#pragma once

#include "commandforge/common/types.hpp"
#include "commandforge/commands/risk_analyzer.hpp"
#include <string>

namespace commandforge {

class ExecutionPolicy {
public:
    explicit ExecutionPolicy(RiskAnalyzer risk_analyzer);
    ~ExecutionPolicy() = default;

    bool evaluate(const ExecutionRequest& request, std::string& rejectReasonOut) const;

private:
    RiskAnalyzer risk_analyzer_;
};

} // namespace commandforge
