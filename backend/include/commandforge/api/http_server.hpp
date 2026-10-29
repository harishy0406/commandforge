#pragma once

#include "commandforge/api/controllers.hpp"
#include <httplib.h>
#include <memory>
#include <atomic>
#include <thread>

namespace commandforge {

class HttpServer {
public:
    HttpServer(std::string host, int port, std::shared_ptr<ApiController> controller);
    ~HttpServer();

    bool start();
    void stop();

private:
    std::string host_;
    int port_;
    std::shared_ptr<ApiController> controller_;
    httplib::Server server_;
    std::atomic<bool> is_running_{false};
    std::thread server_thread_;

    void setupRoutes();
    void setupCors();
};

} // namespace commandforge
