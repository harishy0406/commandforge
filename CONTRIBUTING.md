# Contributing to CommandForge

Thank you for contributing to **CommandForge**, an AI-powered Linux terminal assistant and security-hardened execution platform!

## Code of Conduct
We expect all contributors to maintain respectful, productive, and inclusive interactions.

## Architecture Guidelines
- **Core Engine (C++20)**: Responsible for execution isolation, risk scoring, system monitoring, database persistence, and REST endpoints.
- **Frontend (React 19 + TypeScript + Vite + Tailwind)**: Modern developer dashboard for interactive natural-language translation, approval workflows, terminal telemetry, and history.
- **Security-First**: Never execute commands without explicit user approval. Always isolate execution inside bounded, unprivileged containers.

## Development Workflow

### Prerequisites
- C++20 compliant compiler (GCC 11+, Clang 13+, or MSVC 2022)
- CMake 3.22+
- Node.js 18+ and npm
- Docker Engine with Compose

### Building the C++ Backend
```bash
mkdir -p backend/build
cd backend/build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .
ctest --output-on-failure
```

### Building the Frontend
```bash
cd apps/web
npm install
npm run build
```

### Running with Docker Compose
```bash
docker-compose up --build
```

## Pull Request Guidelines
1. Ensure all unit and integration tests pass.
2. Maintain documentation and code formatting standards.
3. Add tests for any new commands, parsers, or API endpoints.
