#pragma once

#include "commandforge/storage/history_repository.hpp"
#include <mutex>
#include <memory>
#include <sqlite3.h>

namespace commandforge {

class SqliteRepository : public IHistoryRepository {
public:
    explicit SqliteRepository(std::string db_path);
    ~SqliteRepository() override;

    bool initialize() override;
    bool saveExecution(const CommandRecord& record) override;
    std::vector<CommandRecord> getHistory(int page, int limit,
                                         const std::string& statusFilter,
                                         const std::string& searchFilter,
                                         int& totalOut) override;
    std::optional<CommandRecord> getById(const std::string& id) override;
    DashboardSummary getSummary() override;

private:
    std::string db_path_;
    sqlite3* db_{nullptr};
    std::recursive_mutex mutex_;

    void seedInitialDemoData();
};

} // namespace commandforge
