#pragma once

#include "commandforge/common/types.hpp"
#include <vector>
#include <optional>
#include <string>

namespace commandforge {

class IHistoryRepository {
public:
    virtual ~IHistoryRepository() = default;
    virtual bool initialize() = 0;
    virtual bool saveExecution(const CommandRecord& record) = 0;
    virtual std::vector<CommandRecord> getHistory(int page, int limit,
                                                 const std::string& statusFilter,
                                                 const std::string& searchFilter,
                                                 int& totalOut) = 0;
    virtual std::optional<CommandRecord> getById(const std::string& id) = 0;
    virtual DashboardSummary getSummary() = 0;
};

} // namespace commandforge
