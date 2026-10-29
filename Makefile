.PHONY: all build-backend build-frontend test docker-up docker-down clean help

help:
	@echo "CommandForge Build and Development Targets:"
	@echo "  make build-backend   - Compile C++20 backend with CMake"
	@echo "  make build-frontend  - Install and build React frontend"
	@echo "  make test            - Run C++ unit and integration tests"
	@echo "  make docker-up       - Build and launch Docker Compose stack"
	@echo "  make docker-down     - Stop and tear down containers"
	@echo "  make clean           - Remove build artifacts and caches"

build-backend:
	mkdir -p backend/build
	cd backend/build && cmake .. -DCMAKE_BUILD_TYPE=Release -DCOMMANDFORGE_BUILD_TESTS=ON
	cd backend/build && cmake --build . -j

build-frontend:
	cd apps/web && npm install && npm run build

test:
	cd backend/build && ctest --output-on-failure

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down

clean:
	rm -rf backend/build apps/web/dist apps/web/node_modules
