# Monitoring and Observability Guide

This guide covers monitoring, metrics, logging, and observability best practices for the Aura Webhook Server.

## Table of Contents

1. [Health Checks](#health-checks)
2. [Metrics](#metrics)
3. [Logging](#logging)
4. [Alerting](#alerting)
5. [Dashboards](#dashboards)
6. [Troubleshooting](#troubleshooting)

## Health Checks

### Built-in Health Endpoint

The server provides a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production"
}
```

### Docker Health Check

Docker Compose includes automatic health checks:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', ...)"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 5s
```

Check container health:
```bash
docker ps
# Look for "healthy" in STATUS column
```

### Kubernetes Liveness/Readiness Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Metrics

### Key Metrics to Monitor

#### Application Metrics

1. **Request Rate**
   - Webhook requests per second
   - Analytics requests per second

2. **Error Rate**
   - HTTP 4xx errors (client errors)
   - HTTP 5xx errors (server errors)
   - Signature verification failures

3. **Latency**
   - Request processing time
   - Database query time
   - Event handling time

4. **Event Metrics**
   - Events received by type
   - Events processed successfully
   - Events failed to process

5. **Database Metrics**
   - Database size
   - Query performance
   - Write/read operations

#### System Metrics

1. **CPU Usage**
2. **Memory Usage**
3. **Disk I/O**
4. **Network I/O**
5. **Open File Descriptors**

### Prometheus Integration

Add Prometheus metrics to your server:

```typescript
// src/metrics.ts
import promClient from 'prom-client';

// Create registry
const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const webhookCounter = new promClient.Counter({
  name: 'webhook_requests_total',
  help: 'Total webhook requests received',
  labelNames: ['event_type', 'endpoint'],
  registers: [register],
});

export const webhookDuration = new promClient.Histogram({
  name: 'webhook_processing_duration_seconds',
  help: 'Webhook processing duration',
  labelNames: ['event_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const signatureFailures = new promClient.Counter({
  name: 'webhook_signature_failures_total',
  help: 'Total signature verification failures',
  registers: [register],
});

export const dbOperations = new promClient.Counter({
  name: 'database_operations_total',
  help: 'Total database operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Metrics endpoint
export function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}
```

Add to routes:

```typescript
// src/index.ts
import { metricsHandler, webhookCounter, webhookDuration } from './metrics.js';

app.get('/metrics', metricsHandler);

// Instrument webhook endpoint
app.post('/webhooks/verification', async (req, res) => {
  const timer = webhookDuration.startTimer();
  webhookCounter.inc({ event_type: req.body.eventType, endpoint: 'verification' });

  // ... handle webhook ...

  timer({ event_type: req.body.eventType });
});
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'webhook-server'
    static_configs:
      - targets: ['webhook-server:3000']
    metrics_path: /metrics
    scrape_interval: 15s
```

## Logging

### Log Levels

The server uses Winston with the following levels:

- `error`: Error events that might still allow the app to continue running
- `warn`: Warning events (e.g., signature verification failures)
- `info`: Informational messages (e.g., webhook received)
- `debug`: Detailed debug information

Configure via environment variable:
```env
LOG_LEVEL=info
```

### Log Format

Logs include:

```
2024-01-15 10:30:00 [INFO]: Webhook event received {"eventType":"VERIFICATION_SUCCESS","eventId":"123e4567-e89b-12d3-a456-426614174000"}
```

### Structured Logging

All logs are structured for easy parsing:

```typescript
logger.info('Webhook event received', {
  eventType: 'VERIFICATION_SUCCESS',
  eventId: '123e4567-e89b-12d3-a456-426614174000',
  holderDid: 'did:aura:holder123',
  sourceIp: '192.168.1.100'
});
```

### Log Aggregation

#### ELK Stack (Elasticsearch, Logstash, Kibana)

```yaml
# docker-compose.yml
services:
  webhook-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=webhook-server"

  logstash:
    image: logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
```

Logstash configuration:

```ruby
# logstash.conf
input {
  file {
    path => "/app/logs/*.log"
    codec => json
  }
}

filter {
  # Parse timestamp
  date {
    match => ["timestamp", "ISO8601"]
  }

  # Add tags
  mutate {
    add_tag => ["webhook-server"]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "webhook-server-%{+YYYY.MM.dd}"
  }
}
```

#### CloudWatch Logs

```typescript
import { CloudWatchLogsClient, PutLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

const cloudwatchTransport = new CloudWatchTransport({
  logGroupName: '/aws/webhook-server',
  logStreamName: `${process.env.NODE_ENV}-${hostname()}`,
  awsRegion: 'us-east-1',
});

logger.add(cloudwatchTransport);
```

#### Google Cloud Logging

```typescript
import { LoggingWinston } from '@google-cloud/logging-winston';

const loggingWinston = new LoggingWinston({
  projectId: 'your-project-id',
  keyFilename: '/path/to/key.json',
});

logger.add(loggingWinston);
```

### Log Analysis Queries

Common queries for analyzing logs:

```bash
# Count signature failures by IP
grep "signature verification failed" logs/webhook-server.log | \
  jq -r '.ip' | sort | uniq -c | sort -nr

# Find slow requests (>1s)
grep "HTTP Request" logs/webhook-server.log | \
  jq 'select(.duration | tonumber > 1000)'

# Count events by type
grep "Webhook event received" logs/webhook-server.log | \
  jq -r '.eventType' | sort | uniq -c
```

## Alerting

### Alert Rules

Configure alerts for critical conditions:

#### 1. High Error Rate

```yaml
# Prometheus alert
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }} errors/sec"
```

#### 2. Signature Verification Failures

```yaml
- alert: HighSignatureFailureRate
  expr: rate(webhook_signature_failures_total[5m]) > 10
  for: 2m
  annotations:
    summary: "High rate of signature verification failures"
    description: "{{ $value }} failures/sec detected"
```

#### 3. Database Issues

```yaml
- alert: DatabaseErrors
  expr: rate(database_operations_total{status="error"}[5m]) > 1
  for: 5m
  annotations:
    summary: "Database errors detected"
```

#### 4. High Memory Usage

```yaml
- alert: HighMemoryUsage
  expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
  for: 5m
  annotations:
    summary: "High memory usage"
    description: "Less than 10% memory available"
```

### Notification Channels

#### Slack

```yaml
# alertmanager.yml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: 'Webhook Server Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

#### Email

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'ops@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'
```

#### PagerDuty

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

### Custom Alert Script

```bash
#!/bin/bash
# check-webhook-health.sh

HEALTH_URL="http://localhost:3000/health"
WEBHOOK_URL="https://your-notification-service.com/webhook"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
  curl -X POST $WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d "{\"alert\":\"Webhook server health check failed\",\"status\":\"$response\"}"
fi
```

## Dashboards

### Grafana Dashboard

Example dashboard panels:

#### 1. Request Rate

```json
{
  "title": "Webhook Request Rate",
  "targets": [{
    "expr": "rate(webhook_requests_total[5m])",
    "legendFormat": "{{event_type}}"
  }],
  "type": "graph"
}
```

#### 2. Error Rate

```json
{
  "title": "Error Rate",
  "targets": [{
    "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
    "legendFormat": "5xx errors"
  }],
  "type": "graph"
}
```

#### 3. Latency Percentiles

```json
{
  "title": "Request Latency",
  "targets": [
    {
      "expr": "histogram_quantile(0.50, webhook_processing_duration_seconds_bucket)",
      "legendFormat": "p50"
    },
    {
      "expr": "histogram_quantile(0.95, webhook_processing_duration_seconds_bucket)",
      "legendFormat": "p95"
    },
    {
      "expr": "histogram_quantile(0.99, webhook_processing_duration_seconds_bucket)",
      "legendFormat": "p99"
    }
  ],
  "type": "graph"
}
```

#### 4. Events by Type

```json
{
  "title": "Events by Type",
  "targets": [{
    "expr": "webhook_requests_total",
    "legendFormat": "{{event_type}}"
  }],
  "type": "piechart"
}
```

### Analytics Dashboard

Use the built-in analytics endpoint:

```bash
curl http://localhost:3000/analytics | jq
```

Create a simple dashboard:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Webhook Analytics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <canvas id="eventChart"></canvas>

  <script>
    fetch('/analytics')
      .then(r => r.json())
      .then(data => {
        new Chart(document.getElementById('eventChart'), {
          type: 'bar',
          data: {
            labels: Object.keys(data.eventsByType),
            datasets: [{
              label: 'Events by Type',
              data: Object.values(data.eventsByType)
            }]
          }
        });
      });
  </script>
</body>
</html>
```

## Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Check memory usage
docker stats webhook-server

# Check event count
curl http://localhost:3000/analytics | jq '.totalEvents'

# Delete old events
curl -X DELETE "http://localhost:3000/analytics/events/old?days=7" \
  -H "X-API-Key: ${ADMIN_API_KEY}"
```

#### Slow Queries

```bash
# Enable query logging
LOG_LEVEL=debug npm run dev

# Check slow queries in logs
grep "Database query" logs/webhook-server.log | \
  jq 'select(.duration > 100)'
```

#### Connection Refused

```bash
# Check if server is running
curl http://localhost:3000/health

# Check Docker logs
docker-compose logs webhook-server

# Check port binding
netstat -tlnp | grep 3000
```

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

Or at runtime:

```bash
LOG_LEVEL=debug npm run dev
```

### Performance Profiling

```typescript
// Add performance markers
const startTime = Date.now();
// ... do work ...
const duration = Date.now() - startTime;
logger.debug('Operation completed', { operation: 'processEvent', duration });
```

### Memory Profiling

```bash
# Start with memory profiling
node --inspect dist/index.js

# Then connect Chrome DevTools to analyze memory usage
```

## Best Practices

1. **Use structured logging** for easy parsing and analysis
2. **Set up alerts** for critical metrics
3. **Monitor trends** over time, not just current values
4. **Implement health checks** at multiple levels
5. **Use distributed tracing** for complex workflows
6. **Regular review** of logs and metrics
7. **Document baselines** for normal operation
8. **Test alerting** regularly

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboard Examples](https://grafana.com/grafana/dashboards/)
- [Winston Logging](https://github.com/winstonjs/winston)
- [Node.js Monitoring Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
