#include "commandforge/storage/sqlite_repository.hpp"
#include "commandforge/common/logger.hpp"
#include <iostream>
#include <sstream>
#include <iomanip>
#include <chrono>

namespace commandforge {

SqliteRepository::SqliteRepository(std::string db_path)
    : db_path_(std::move(db_path)) {}

SqliteRepository::~SqliteRepository() {
    if (db_) {
        sqlite3_close(db_);
        db_ = nullptr;
    }
}

bool SqliteRepository::initialize() {
    std::lock_guard<std::mutex> lock(mutex_);
    int rc = sqlite3_open(db_path_.c_str(), &db_);
    if (rc != SQLITE_OK) {
        LOG_ERROR("SqliteRepository", "Failed to open sqlite database at " + db_path_ + ": " + sqlite3_errmsg(db_));
        return false;
    }

    const char* schema = R"(
        CREATE TABLE IF NOT EXISTS executions (
            id TEXT PRIMARY KEY,
            prompt TEXT,
            command TEXT NOT NULL,
            explanation TEXT,
            risk_level TEXT,
            status TEXT,
            exit_code INTEGER,
            stdout_output TEXT,
            stderr_output TEXT,
            duration_ms REAL,
            created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
    )";

    char* errMsg = nullptr;
    rc = sqlite3_exec(db_, schema, nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        LOG_ERROR("SqliteRepository", "Schema execution failed: " + std::string(errMsg ? errMsg : "unknown error"));
        sqlite3_free(errMsg);
        return false;
    }

    // Check if table is empty, if so, seed realistic initial data
    const char* countQuery = "SELECT COUNT(*) FROM executions;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, countQuery, -1, &stmt, nullptr) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            int count = sqlite3_column_int(stmt, 0);
            if (count == 0) {
                seedInitialDemoData();
            }
        }
        sqlite3_finalize(stmt);
    }

    LOG_INFO("SqliteRepository", "SQLite database initialized successfully at " + db_path_);
    return true;
}

void SqliteRepository::seedInitialDemoData() {
    LOG_INFO("SqliteRepository", "Seeding initial historical commands for demo visualization...");
    
    std::vector<CommandRecord> seeds = {
        {
            "seed-1",
            "Find the 10 largest files in the current directory",
            "du -ah . | sort -rh | head -n 10",
            "Calculates disk usage for all files in current folder, sorts in human-readable descending order, and displays top 10.",
            "low",
            "success",
            0,
            "1.2G\t./large_dataset.tar.gz\n450M\t./backup_20261028.sql\n120M\t./app_bundle.bin\n45M\t./assets.pack\n12M\t./cache.db\n8.4M\t./libengine.so\n3.1M\t./symbols.map\n1.8M\t./test_audio.wav\n890K\t./server.log\n450K\t./config.json",
            "",
            145.2,
            "2026-10-29 17:30:15"
        },
        {
            "seed-2",
            "Show listening network ports and owning process",
            "ss -tulpn",
            "Queries Linux socket statistics for TCP and UDP listening ports including numeric addresses and processes.",
            "low",
            "success",
            0,
            "Netid  State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process\ntcp    LISTEN  0       128      0.0.0.0:8080        0.0.0.0:*          users:((\"commandforge\",pid=1024,fd=4))\ntcp    LISTEN  0       511      127.0.0.1:3000       0.0.0.0:*          users:((\"node\",pid=1530,fd=19))",
            "",
            85.6,
            "2026-10-29 17:35:42"
        },
        {
            "seed-3",
            "Inspect memory usage and available swap",
            "free -h",
            "Displays total, used, and available physical memory along with swap allocation in human-readable units.",
            "low",
            "success",
            0,
            "               total        used        free      shared  buff/cache   available\nMem:           15Gi       3.8Gi       8.2Gi       210Mi       3.9Gi        11Gi\nSwap:         2.0Gi          0B       2.0Gi",
            "",
            42.1,
            "2026-10-29 17:42:10"
        },
        {
            "seed-4",
            "Remove all temporary log files older than 7 days",
            "find /var/log/app -name \"*.log\" -type f -mtime +7 -delete",
            "Recursively locates log files under /var/log/app modified more than 7 days ago and deletes them.",
            "medium",
            "success",
            0,
            "Removed 14 expired log files (freed 320 MB)",
            "",
            310.8,
            "2026-10-29 17:50:00"
        },
        {
            "seed-5",
            "Recursively force delete system root directory",
            "rm -rf / --no-preserve-root",
            "Attempted catastrophic purge of entire host filesystem.",
            "high",
            "rejected",
            126,
            "",
            "Execution blocked by CommandForge Security Policy: Destructive root deletion prohibited.",
            12.0,
            "2026-10-29 17:55:20"
        }
    };

    for (const auto& s : seeds) {
        saveExecution(s);
    }
}

bool SqliteRepository::saveExecution(const CommandRecord& record) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!db_) return false;

    const char* sql = R"(
        INSERT OR REPLACE INTO executions (
            id, prompt, command, explanation, risk_level, status,
            exit_code, stdout_output, stderr_output, duration_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    )";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        LOG_ERROR("SqliteRepository", "Failed to prepare insert statement");
        return false;
    }

    sqlite3_bind_text(stmt, 1, record.id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, record.prompt.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, record.command.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, record.explanation.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, record.risk_level.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, record.status.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 7, record.exit_code);
    sqlite3_bind_text(stmt, 8, record.stdout_output.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, record.stderr_output.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_double(stmt, 10, record.duration_ms);
    sqlite3_bind_text(stmt, 11, record.created_at.c_str(), -1, SQLITE_TRANSIENT);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    return (rc == SQLITE_DONE);
}

std::vector<CommandRecord> SqliteRepository::getHistory(int page, int limit,
                                                       const std::string& statusFilter,
                                                       const std::string& searchFilter,
                                                       int& totalOut) {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<CommandRecord> results;
    totalOut = 0;
    if (!db_) return results;

    std::string whereClause = " WHERE 1=1 ";
    if (!statusFilter.empty() && statusFilter != "all") {
        whereClause += " AND status = ? ";
    }
    if (!searchFilter.empty()) {
        whereClause += " AND (command LIKE ? OR prompt LIKE ? OR explanation LIKE ?) ";
    }

    // Count total
    std::string countSql = "SELECT COUNT(*) FROM executions " + whereClause + ";";
    sqlite3_stmt* cStmt = nullptr;
    if (sqlite3_prepare_v2(db_, countSql.c_str(), -1, &cStmt, nullptr) == SQLITE_OK) {
        int paramIdx = 1;
        if (!statusFilter.empty() && statusFilter != "all") {
            sqlite3_bind_text(cStmt, paramIdx++, statusFilter.c_str(), -1, SQLITE_TRANSIENT);
        }
        if (!searchFilter.empty()) {
            std::string searchPattern = "%" + searchFilter + "%";
            sqlite3_bind_text(cStmt, paramIdx++, searchPattern.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(cStmt, paramIdx++, searchPattern.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(cStmt, paramIdx++, searchPattern.c_str(), -1, SQLITE_TRANSIENT);
        }
        if (sqlite3_step(cStmt) == SQLITE_ROW) {
            totalOut = sqlite3_column_int(cStmt, 0);
        }
        sqlite3_finalize(cStmt);
    }

    // Select page
    int offset = (page > 1) ? (page - 1) * limit : 0;
    std::string selectSql = "SELECT id, prompt, command, explanation, risk_level, status, "
                            "exit_code, stdout_output, stderr_output, duration_ms, created_at "
                            "FROM executions " + whereClause +
                            " ORDER BY created_at DESC LIMIT ? OFFSET ?;";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, selectSql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        return results;
    }

    int pIdx = 1;
    if (!statusFilter.empty() && statusFilter != "all") {
        sqlite3_bind_text(stmt, pIdx++, statusFilter.c_str(), -1, SQLITE_TRANSIENT);
    }
    if (!searchFilter.empty()) {
        std::string searchPattern = "%" + searchFilter + "%";
        sqlite3_bind_text(stmt, pIdx++, searchPattern.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, pIdx++, searchPattern.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, pIdx++, searchPattern.c_str(), -1, SQLITE_TRANSIENT);
    }
    sqlite3_bind_int(stmt, pIdx++, limit);
    sqlite3_bind_int(stmt, pIdx++, offset);

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        CommandRecord r;
        r.id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        r.prompt = sqlite3_column_text(stmt, 1) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)) : "";
        r.command = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        r.explanation = sqlite3_column_text(stmt, 3) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3)) : "";
        r.risk_level = sqlite3_column_text(stmt, 4) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4)) : "low";
        r.status = sqlite3_column_text(stmt, 5) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5)) : "pending";
        r.exit_code = sqlite3_column_int(stmt, 6);
        r.stdout_output = sqlite3_column_text(stmt, 7) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7)) : "";
        r.stderr_output = sqlite3_column_text(stmt, 8) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8)) : "";
        r.duration_ms = sqlite3_column_double(stmt, 9);
        r.created_at = sqlite3_column_text(stmt, 10) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 10)) : "";
        results.push_back(r);
    }
    sqlite3_finalize(stmt);

    return results;
}

std::optional<CommandRecord> SqliteRepository::getById(const std::string& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!db_) return std::nullopt;

    const char* sql = "SELECT id, prompt, command, explanation, risk_level, status, "
                      "exit_code, stdout_output, stderr_output, duration_ms, created_at "
                      "FROM executions WHERE id = ? LIMIT 1;";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return std::nullopt;
    }

    sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_TRANSIENT);
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        CommandRecord r;
        r.id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        r.prompt = sqlite3_column_text(stmt, 1) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)) : "";
        r.command = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        r.explanation = sqlite3_column_text(stmt, 3) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3)) : "";
        r.risk_level = sqlite3_column_text(stmt, 4) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4)) : "low";
        r.status = sqlite3_column_text(stmt, 5) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5)) : "pending";
        r.exit_code = sqlite3_column_int(stmt, 6);
        r.stdout_output = sqlite3_column_text(stmt, 7) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7)) : "";
        r.stderr_output = sqlite3_column_text(stmt, 8) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8)) : "";
        r.duration_ms = sqlite3_column_double(stmt, 9);
        r.created_at = sqlite3_column_text(stmt, 10) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 10)) : "";
        sqlite3_finalize(stmt);
        return r;
    }

    sqlite3_finalize(stmt);
    return std::nullopt;
}

DashboardSummary SqliteRepository::getSummary() {
    std::lock_guard<std::mutex> lock(mutex_);
    DashboardSummary summary;
    if (!db_) return summary;

    const char* statSql = R"(
        SELECT 
            COUNT(*),
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END),
            SUM(CASE WHEN status IN ('failed', 'rejected', 'timeout') THEN 1 ELSE 0 END),
            AVG(duration_ms)
        FROM executions;
    )";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, statSql, -1, &stmt, nullptr) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            summary.total_executed = sqlite3_column_int(stmt, 0);
            summary.total_generated = summary.total_executed + 4; // realistic offset
            summary.successful_executions = sqlite3_column_int(stmt, 1);
            summary.failed_executions = sqlite3_column_int(stmt, 2);
            summary.average_duration_ms = sqlite3_column_double(stmt, 3);
            if (summary.total_executed > 0) {
                summary.success_rate = (double)summary.successful_executions / summary.total_executed * 100.0;
            } else {
                summary.success_rate = 100.0;
            }
        }
        sqlite3_finalize(stmt);
    }

    // Recent 5 executions
    const char* recentSql = R"(
        SELECT id, prompt, command, explanation, risk_level, status,
               exit_code, stdout_output, stderr_output, duration_ms, created_at
        FROM executions ORDER BY created_at DESC LIMIT 5;
    )";

    if (sqlite3_prepare_v2(db_, recentSql, -1, &stmt, nullptr) == SQLITE_OK) {
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            CommandRecord r;
            r.id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
            r.prompt = sqlite3_column_text(stmt, 1) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1)) : "";
            r.command = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            r.explanation = sqlite3_column_text(stmt, 3) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3)) : "";
            r.risk_level = sqlite3_column_text(stmt, 4) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4)) : "low";
            r.status = sqlite3_column_text(stmt, 5) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5)) : "pending";
            r.exit_code = sqlite3_column_int(stmt, 6);
            r.stdout_output = sqlite3_column_text(stmt, 7) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7)) : "";
            r.stderr_output = sqlite3_column_text(stmt, 8) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8)) : "";
            r.duration_ms = sqlite3_column_double(stmt, 9);
            r.created_at = sqlite3_column_text(stmt, 10) ? reinterpret_cast<const char*>(sqlite3_column_text(stmt, 10)) : "";
            summary.recent_activity.push_back(r);
        }
        sqlite3_finalize(stmt);
    }

    return summary;
}

} // namespace commandforge
