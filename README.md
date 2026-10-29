# CommandForge — AI-Powered Linux Terminal Assistant

[![CI Pipeline](https://github.com/commandforge/commandforge/actions/workflows/ci.yml/badge.svg)](https://github.com/commandforge/commandforge/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![C++20](https://img.shields.io/badge/Language-C%2B%2B20-blue.svg)](https://en.cppreference.com/w/cpp/20)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61dafb.svg)](https://react.dev/)
[![Docker Hardened](https://img.shields.io/badge/Execution-Docker%20Sandbox-2496ed.svg)](https://www.docker.com/)

> **CommandForge** is a systems-engineered Linux terminal assistant with a dark developer dashboard. It translates natural language objectives into verified shell commands, analyzes security risks, mandates explicit human-in-the-loop approval, and executes instructions exclusively inside isolated, disposable Docker containers.

---

## Architecture Overview

```
+-------------------------------------------------------------+
|                      React 19 Frontend                      |
|  - Overview Dashboard  - Command Assistant  - History Modal |
|  - System Telemetry    - Settings Page      - Output Stream |
+------------------------------+------------------------------+
                               | REST JSON (Vite Reverse Proxy)
                               v
+-------------------------------------------------------------+
|                 C++20 High-Performance Engine               |
|  - cpp-httplib Asynchronous HTTP Server                     |
|  - nlohmann/json Schema Serialization                       |
|  - SQLite3 Persistent Execution Repository                  |
+------------------------------+------------------------------+
         |                     |                     |
         v                     v                     v
+-----------------+   +-----------------+   +-----------------+
|   AI Provider   |   | Risk & Security |   | System Monitor  |
|  - Mock/Offline |   |  Policy Engine  |   |  - Linux ProcFS |
|  - OpenAI/Custom|   |  - AST Check    |   |  - Memory & CPU |
|    (GPT-4o/o3)  |   |  - Blocklists   |   |  - Task Counts  |
+-----------------+   +-----------------+   +-----------------+
                               |
                               v
                      +-----------------+
                      | Isolation Engine|
                      |  - Docker Engine|
                      |  - Non-root UID |
                      |  - No-network   |
                      |  - Bounded Caps |
                      +-----------------+
                               |
                               v
                      +-----------------+
                      | Sandbox Output  |
                      | (stdout/stderr) |
                      +-----------------+
```

---

## Key Features

1. **Natural-to-Shell Command Synthesis**:
   - Accurately converts complex natural language queries into idiomatic Linux commands.
   - Powered by a configurable OpenAI-compatible endpoint or an offline heuristic Mock provider.
   - Zero external API keys needed for testing or local demo trials.

2. **Security & Risk Assessment Engine**:
   - Deterministic AST token parsing and rule-based heuristics.
   - Classifies commands into **Low**, **Medium**, and **High** risk levels.
   - Immediately blocks catastrophic operations (e.g. `rm -rf /`, fork bombs, raw disk writes, base64 subshells, metadata sniffing).
   - Flags file deletions and filesystem mutations with dual-step confirmation prompts.

3. **Multi-Barrier Execution Isolation**:
   - Commands are **never executed directly on the host operating system**.
   - Runs exclusively inside a hardened Docker container (`commandforge-sandbox:latest`):
     - Non-root execution (`sandbox` user, UID `10001`)
     - Read-only root filesystem with ephemeral scratch space
     - Network disabled by default (`--network none`)
     - Drops all Linux capabilities (`--cap-drop=ALL`)
     - Enforced memory quotas (`256 MB`), CPU quotas (`0.5 CPU`), and PIDs limits (`64`)

4. **Terminal Telemetry & Output Guard**:
   - Captures real-time `stdout`, `stderr`, exit codes, and millisecond lifecycle durations.
   - Configurable timeout enforcement with automated process termination (`SIGKILL`).
   - 64 KB buffer guard prevents memory exhaustion and denial-of-service from log flooding.

5. **Persistent History & Audit Trail**:
   - Embedded SQLite3 repository stores prompts, generated syntax, explanations, risk classifications, exit codes, and timestamps.
   - Searchable, filterable, and paginated interface with deep-inspection modal views.

6. **Host & Container Resource Telemetry**:
   - Samples live CPU utilization, physical/virtual RAM allocations, disk quotas, and process counts via `/proc` on Linux or OS adapters.
   - Live telemetry timeline charts.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Backend Core** | C++20, `cpp-httplib`, `nlohmann/json`, `SQLite3`, `GoogleTest` |
| **Frontend UI** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts |
| **Isolation & DevOps** | Docker Engine API, Alpine 3.20 Sandbox, Multi-stage Dockerfiles, Docker Compose |
| **Testing & CI** | CTest, GoogleTest (Unit, Integration, Security), GitHub Actions |

---

## Directory Structure

```
commandforge/
├── apps/
│   └── web/                   # React 19 + TypeScript frontend dashboard
│       ├── src/
│       │   ├── app/           # Main App coordinator
│       │   ├── components/    # Layout, Sidebar, Header
│       │   ├── pages/         # Assistant, Overview, History, Monitor, Settings
│       │   ├── services/      # Typed API client
│       │   ├── types/         # TypeScript API contracts
│       │   └── styles/        # Tailwind CSS globals
│       ├── package.json
│       └── vite.config.ts
├── backend/                   # C++20 Core Systems Engine
│   ├── CMakeLists.txt
│   ├── include/commandforge/
│   │   ├── ai/                # Mock and OpenAI LLM providers
│   │   ├── api/               # Controllers & HTTP REST server
│   │   ├── commands/          # Risk analyzer & AST validator
│   │   ├── common/            # Types, structured Logger
│   │   ├── config/            # Environment configuration
│   │   ├── execution/         # Docker adapter, policies, engine
│   │   ├── monitoring/        # Linux /proc system monitor
│   │   └── storage/           # SQLite3 repository
│   ├── src/                   # C++ implementations
│   └── tests/                 # Unit, Integration, Security, and Benchmarks
├── docker/                    # Hardened Docker environments
│   ├── Dockerfile.backend     # Multi-stage Ubuntu C++ builder & runtime
│   ├── Dockerfile.frontend    # Multi-stage Node + Nginx SPA server
│   └── execution/             # Hardened Alpine unprivileged sandbox
├── shared/api-schemas/        # OpenAPI 3.0 schema contract
├── docs/                      # Architecture, API, and Security guides
├── docker-compose.yml         # Unified orchestration stack
├── Makefile                   # Developer task automation
└── .env.example               # Environment template
```

---

## Prerequisites

- **Docker & Docker Compose**: v24+
- **Node.js**: v18+ & npm
- **C++ Compiler**: GCC 11+, Clang 13+, or MSVC 2022
- **CMake**: v3.22+

---

## Quickstart: Docker Compose (Recommended)

1. **Clone the repository and copy environment**:
   ```bash
   git clone https://github.com/commandforge/commandforge.git
   cd commandforge
   cp .env.example .env
   ```

2. **Launch full stack with Docker Compose**:
   ```bash
   docker-compose up --build -d
   ```

3. **Access Services**:
   - **Web Dashboard**: `http://localhost:3000`
   - **Backend REST API**: `http://localhost:8080/api`
   - **API Health**: `http://localhost:8080/api/health`

---

## Local Development Workflow

### 1. Build and Run C++ Backend
```bash
# Configure and build with CMake
mkdir -p backend/build
cd backend/build
cmake .. -DCMAKE_BUILD_TYPE=Release -DCOMMANDFORGE_BUILD_TESTS=ON
cmake --build . -j

# Run the test suite
ctest --output-on-failure

# Launch the server executable
./bin/commandforge-server
```

### 2. Run React Frontend
```bash
cd apps/web
npm install
npm run dev
```
Navigate to `http://localhost:3000`. Requests to `/api` are automatically proxied to the backend on `localhost:8080`.

---

## Configuration Variables

Configure via environment variables or `.env`:

| Variable | Default | Description |
|---|---|---|
| `COMMANDFORGE_HOST` | `0.0.0.0` | Server bind host address |
| `COMMANDFORGE_PORT` | `8080` | Server HTTP port |
| `COMMANDFORGE_DB_PATH` | `commandforge.db` | SQLite database file location |
| `COMMANDFORGE_AI_PROVIDER` | `mock` | `mock` (offline, zero-cost) or `openai` |
| `COMMANDFORGE_AI_API_KEY` | *(empty)* | Upstream LLM authorization bearer token |
| `COMMANDFORGE_AI_MODEL` | `gpt-4o-mini` | Upstream model identifier |
| `COMMANDFORGE_DOCKER_IMAGE`| `commandforge-sandbox:latest` | Target execution container |
| `COMMANDFORGE_EXECUTION_TIMEOUT_SECONDS` | `10` | Hard timeout limit for command runs |
| `COMMANDFORGE_MAX_OUTPUT_BYTES` | `65536` | Buffer size truncation threshold (64 KB) |

---

## Security Model & Principles

1. **Human-in-the-Loop Approval Required**:
   Commands are never dispatched merely because they were generated or viewed. Users must inspect the syntax, read the explanation, and click **Explicitly Approve & Execute**.

2. **High-Risk Operations Blocked**:
   Irreversible commands (e.g. system root deletion, raw partition writes, kernel memory inspection, fork bombs, privilege escalations) are blocked immediately by the C++ AST policy engine with rejection codes.

3. **Non-Root Execution in Ephemeral Sandbox**:
   All container commands run as unprivileged user `sandbox` (UID 10001) with `--network none` and `--cap-drop=ALL`.

4. **Zero-Secret Exposure**:
   API keys and authorization credentials exist exclusively on the backend server environment and are strictly omitted from client responses.

---

## Running Benchmarks

Measure the throughput and latency of the C++ AST validation policy and mock translation engine:

```bash
cd backend/build
./bin/commandforge-benchmark
```
*Synthetic Benchmark Sample Output:*
```
Operations completed: 10,000
Prohibited violations caught: 2,000
Total Elapsed Time: ~38 ms
Throughput: ~260,000 ops/sec
Average latency: 3.8 microseconds per command assessment
```

---

## Roadmap

- [x] C++20 Asynchronous REST server
- [x] Docker isolation engine with non-root UID and dropped capabilities
- [x] Offline heuristic Mock AI provider
- [x] OpenAI-compatible endpoint integration
- [x] Dark developer dashboard with Lucide and Recharts
- [x] Persistent SQLite3 execution history repository
- [x] Live system telemetry sampling from `/proc`
- [ ] WebSocket streaming for real-time interactive terminal sessions
- [ ] Multi-tenant workspace mount points with per-user quotas

---

## License

Distributed under the [MIT License](LICENSE).
