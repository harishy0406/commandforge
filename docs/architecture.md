# CommandForge Architecture

## Overview
CommandForge is an AI-powered Linux terminal assistant designed with an execution-isolation architecture. It bridges natural language intent to validated POSIX commands, requiring explicit human authorization before executing instructions inside isolated containers.

```
+-------------------------------------------------------------+
|                      React Frontend (Vite)                  |
|  - Dashboard Summary  - Command Assistant  - History Table  |
|  - System Telemetry   - Settings View     - XTerm Output    |
+------------------------------+------------------------------+
                               | REST JSON / SSE
                               v
+-------------------------------------------------------------+
|                      C++20 REST Engine                      |
|  - Request Router & Input Validator                         |
|  - Configuration Management & Structured Logging            |
+------------------------------+------------------------------+
         |                     |                     |
         v                     v                     v
+-----------------+   +-----------------+   +-----------------+
|   AI Provider   |   | Risk & Security |   | System Monitor  |
|  - Mock/Offline |   |  Policy Engine  |   |  - Linux ProcFS |
|  - OpenAI/Custom|   |  - Syntax Parse |   |  - Process Stat |
|  - Anthropic    |   |  - AST Check    |   |  - Memory & CPU |
+-----------------+   +-----------------+   +-----------------+
                               |
                               v
                      +-----------------+
                      | Isolation Engine|
                      |  - Docker Adapter
                      |  - Non-root UID |
                      |  - No-network   |
                      |  - Bounded Caps |
                      +-----------------+
                               |
                               v
                      +-----------------+
                      | SQLite Database |
                      |  - Run History  |
                      |  - Audit Log    |
                      +-----------------+
```

## Core Modules

### 1. HTTP Server & REST API (`commandforge/api`)
Provides a high-throughput, asynchronous C++ REST server exposing endpoints for generation, validation, execution, metrics, history, and settings.

### 2. AI Translation Service (`commandforge/ai`)
Decoupled provider interface supporting offline deterministic mock generation (ideal for testing and zero-cost local trials) and live LLM endpoints (OpenAI API-compatible).

### 3. Risk & Validation Engine (`commandforge/commands`)
Applies deterministic syntax parsing, blocklists, heuristics, and semantic classification (Low, Medium, High). High-risk operations (e.g. file deletion, recursion, device manipulation) trigger mandatory user confirmations.

### 4. Isolated Execution Engine (`commandforge/execution`)
Executes commands inside sandboxed Docker containers:
- Read-only rootfs with ephemeral scratch storage
- Non-root user (UID 10001)
- Dropped capabilities (`ALL` dropped, minimal retained)
- Network disabled by default (`--network none`)
- Strict CPU, memory, and timeout bounds (e.g. 10s default)
- Buffer-size truncator to prevent memory exhaustion

### 5. System Monitor Service (`commandforge/monitoring`)
Samples CPU load, virtual and physical memory usage, disk utilization, and running processes directly from `/proc` on Linux or via platform adapters with graceful fallbacks.

### 6. Persistence (`commandforge/storage`)
SQLite3 repository storing command executions, timings, standard outputs, exit codes, and audit records with migration support.
