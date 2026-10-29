cmake_minimum_required(VERSION 3.20)
project(commandforge_backend VERSION 1.0.0 LANGUAGES C CXX)

if(POLICY CMP0135)
    cmake_policy(SET CMP0135 NEW)
endif()

# Check compiler C++20 support
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED OFF)
set(CMAKE_CXX_EXTENSIONS OFF)

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

option(COMMANDFORGE_BUILD_TESTS "Build CommandForge unit and integration tests" ON)

include(FetchContent)
set(FETCHCONTENT_QUIET FALSE)

# 1. nlohmann/json
FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(nlohmann_json)

# 2. cpp-httplib (Header-only HTTP framework)
FetchContent_Declare(
    httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG v0.18.0
    GIT_SHALLOW TRUE
)
set(HTTPLIB_COMPILE OFF CACHE BOOL "Header-only httplib")
FetchContent_MakeAvailable(httplib)

# 3. SQLite3
find_package(SQLite3 QUIET)
if(NOT SQLite3_FOUND)
    message(STATUS "SQLite3 not found on system; fetching amalgamation from GitHub...")
    FetchContent_Declare(
        sqlite3_src
        GIT_REPOSITORY https://github.com/azadkuh/sqlite-amalgamation.git
        GIT_TAG 3.38.2
        GIT_SHALLOW TRUE
    )
    FetchContent_MakeAvailable(sqlite3_src)
    add_library(sqlite3 STATIC ${sqlite3_src_SOURCE_DIR}/sqlite3.c)
    target_include_directories(sqlite3 PUBLIC ${sqlite3_src_SOURCE_DIR})
    if(UNIX)
        target_link_libraries(sqlite3 PRIVATE pthread dl)
    endif()
    set(SQLITE3_TARGET sqlite3)
else()
    set(SQLITE3_TARGET SQLite::SQLite3)
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
    ${httplib_SOURCE_DIR}
)

target_link_libraries(commandforge_core PUBLIC
    nlohmann_json::nlohmann_json
    ${SQLITE3_TARGET}
)

if(WIN32)
    target_link_libraries(commandforge_core PUBLIC ws2_32 crypt32 psapi)
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
    FetchContent_Declare(
        googletest
        GIT_REPOSITORY https://github.com/google/googletest.git
        GIT_TAG v1.14.0
        GIT_SHALLOW TRUE
    )
    # For Windows: Prevent overriding the parent project's compiler/linker settings
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
