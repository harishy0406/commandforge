#include "commandforge/execution/execution_policy.hpp"

namespace commandforge {

ExecutionPolicy::ExecutionPolicy(RiskAnalyzer risk_analyzer)
    : risk_analyzer_(std::move(risk_analyzer)) {}

bool ExecutionPolicy::evaluate(const ExecutionRequest& request, std::string& rejectReasonOut) const {
    if (!request.user_approved) {
        rejectReasonOut = "Execution rejected: Explicit user approval is required before running any command.";
        return false;
    }

    ValidationResult val = risk_analyzer_.validate(request.command);
    if (!val.is_allowed) {
        rejectReasonOut = "Security Boundary Violation: ";
        if (!val.blocked_reasons.empty()) {
            rejectReasonOut += val.blocked_reasons.front();
        } else {
            rejectReasonOut += "Command is prohibited by policy.";
        }
        return false;
    }

    if (val.risk_level == RiskLevel::High && request.risk_level != RiskLevel::High) {
        rejectReasonOut = "Risk Escalation Warning: Command detected as high risk but submitted with lower risk designation.";
        return false;
    }

    return true;
}

} // namespace commandforge
