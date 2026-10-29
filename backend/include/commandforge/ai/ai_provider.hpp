#pragma once

#include "commandforge/common/types.hpp"
#include <string>
#include <memory>

namespace commandforge {

class IAIProvider {
public:
    virtual ~IAIProvider() = default;
    virtual GeneratedCommand generateCommand(const std::string& prompt, const std::string& context = "") = 0;
};

} // namespace commandforge
