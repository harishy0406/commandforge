cmake_minimum_required(VERSION 3.20)
project(commandforge_backend VERSION 1.0.0 LANGUAGES C CXX)

# Support modern C++
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED OFF)
set(CMAKE_CXX_EXTENSIONS OFF)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

if(WIN32)
    add_compile_definitions(_WIN32_WINNT=0x0A00 WINVER=0x0A00 NTDDI_VERSION=0x0A000000)
endif()

option(COMMANDFORGE_BUILD_TESTS "Build CommandForge unit and integration tests" ON)

# Vendored SQLite3
add_library(sqlite3 STATIC src/storage/sqlite3.c)
target_include_directories(sqlite3 PUBLIC include)
if(UNIX)
    target_link_libraries(sqlite3 PRIVATE pthread dl)
endif()

# Core CommandForge Library
add_library(commandforge_core STATIC
    src/common/logger.cpp
    src/config/config.cpp
    src/storage/sqlite_repository.cpp
    src/commands/risk_analyzer.cpp
    src/ai/mock_provider.cpp
    src/ai/openai_provider.cpp
    src/execution/execution_policy.cpp
    src/execution/docker_adapter.cpp
    src/execution/execution_engine.cpp
    src/monitoring/system_monitor.cpp
    src/api/controllers.cpp
    src/api/http_server.cpp
)

target_include_directories(commandforge_core PUBLIC
    include
)

target_link_libraries(commandforge_core PUBLIC
    sqlite3
)

if(WIN32)
    target_link_libraries(commandforge_core PUBLIC ws2_32 crypt32 psapi winhttp)
else()
    target_link_libraries(commandforge_core PUBLIC pthread dl)
endif()

# Server Executable
add_executable(commandforge-server src/main.cpp)
target_link_libraries(commandforge-server PRIVATE commandforge_core)

# Benchmark Executable
add_executable(commandforge-benchmark tests/benchmark/benchmark_concurrency.cpp)
target_link_libraries(commandforge-benchmark PRIVATE commandforge_core)

# Tests
if(COMMANDFORGE_BUILD_TESTS)
    enable_testing()
    include(FetchContent)
    FetchContent_Declare(
        googletest
        GIT_REPOSITORY https://github.com/google/googletest.git
        GIT_TAG v1.14.0
        GIT_SHALLOW TRUE
    )
    set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(googletest)

    add_executable(commandforge-tests
        tests/unit/test_risk_analyzer.cpp
        tests/unit/test_execution_policy.cpp
        tests/unit/test_ai_provider.cpp
        tests/unit/test_storage.cpp
        tests/unit/test_system_monitor.cpp
        tests/security/test_security_boundaries.cpp
        tests/integration/test_api_endpoints.cpp
    )

    target_link_libraries(commandforge-tests PRIVATE
        commandforge_core
        GTest::gtest_main
    )

    include(GoogleTest)
    gtest_discover_tests(commandforge-tests)
endif()
