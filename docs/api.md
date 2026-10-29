# CommandForge API Reference

Base URL: `http://localhost:8080/api`

### Endpoints

#### `GET /health`
Returns backend health and provider configuration.
```json
{
  "status": "healthy",
  "timestamp": "2026-10-29T18:00:00Z",
  "version": "1.0.0",
  "execution_adapter": "docker",
  "ai_provider": "mock"
}
```

#### `GET /dashboard/summary`
Returns aggregate statistics for the dashboard.
```json
{
  "total_generated": 42,
  "total_executed": 38,
  "successful_executions": 35,
  "failed_executions": 3,
  "average_duration_ms": 142.5,
  "success_rate": 92.1,
  "cpu_usage_pct": 14.2,
  "memory_usage_pct": 38.5,
  "recent_activity": []
}
```

#### `POST /commands/generate`
Transforms natural language to a shell command.
**Request:**
```json
{
  "prompt": "List all listening network ports with process names",
  "context": "Linux host"
}
```
**Response:**
```json
{
  "command": "ss -tulpn",
  "explanation": "Displays all listening TCP and UDP sockets along with numeric port numbers and owning process identifiers.",
  "risk_level": "low",
  "risk_reason": "Read-only inspection command; does not alter state.",
  "potentially_destructive": false,
  "requires_confirmation": false,
  "suggested_alternatives": ["netstat -tulnp", "lsof -i -P -n | grep LISTEN"]
}
```

#### `POST /commands/validate`
Validates command safety and generates risk alerts.
**Request:**
```json
{
  "command": "rm -rf /tmp/test"
}
```
**Response:**
```json
{
  "is_valid": true,
  "risk_level": "medium",
  "warnings": ["Command performs recursive file deletion."],
  "blocked_reasons": [],
  "is_allowed": true
}
```

#### `POST /commands/execute`
Executes an approved command inside the container sandbox.
**Request:**
```json
{
  "command": "ls -la /workspace",
  "prompt": "Show directory files",
  "risk_level": "low",
  "user_approved": true,
  "timeout_seconds": 10
}
```
**Response:**
```json
{
  "id": "c1f7b029-...",
  "status": "success",
  "exit_code": 0,
  "stdout": "total 8\ndrwxr-xr-x 2 sandbox sandbox 4096 ...\n",
  "stderr": "",
  "duration_ms": 215.4,
  "output_truncated": false,
  "executed_at": "2026-10-29T18:05:00Z",
  "environment": "docker-sandbox"
}
```

#### `GET /commands/history`
Query execution records with pagination and filters.
- Query parameters: `page`, `limit`, `status`, `search`

#### `GET /system/metrics`
Collects live telemetry.
```json
{
  "cpu_usage_pct": 12.4,
  "memory_used_mb": 4096.0,
  "memory_total_mb": 16384.0,
  "memory_usage_pct": 25.0,
  "disk_used_gb": 45.2,
  "disk_total_gb": 256.0,
  "disk_usage_pct": 17.6,
  "active_processes": 128,
  "timestamp": "2026-10-29T18:06:00Z",
  "metrics_source": "linux_procfs"
}
```
