FROM alpine:3.20

# Install standard Linux utilities for command execution
RUN apk update && apk add --no-cache \
    bash \
    coreutils \
    findutils \
    grep \
    sed \
    gawk \
    procps \
    tar \
    gzip \
    curl \
    jq \
    file \
    tree \
    which \
    util-linux

# Create non-root unprivileged sandbox user
RUN addgroup -g 10001 -S sandbox && \
    adduser -u 10001 -S -G sandbox -s /bin/bash -h /home/sandbox sandbox

# Setup restricted workspace directory
RUN mkdir -p /workspace && \
    chown -R sandbox:sandbox /workspace /home/sandbox && \
    chmod 755 /workspace

USER sandbox
WORKDIR /workspace

CMD ["/bin/bash"]
