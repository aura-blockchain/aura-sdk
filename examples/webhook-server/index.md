# Aura Webhook Server - Complete Documentation Index

Welcome to the Aura Webhook Server! This is a production-ready webhook server for receiving real-time verification notifications from the Aura Network.

## Quick Navigation

### Getting Started

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
- **[README](README.md)** - Complete feature overview and API documentation
- **[.env.example](.env.example)** - Environment configuration template

### Deployment

- **[Deployment Guide](DEPLOYMENT.md)** - Docker, Kubernetes, and cloud deployment options
- **[docker-compose.yml](docker-compose.yml)** - Docker Compose configuration
- **[Dockerfile](Dockerfile)** - Container build instructions
- **[nginx.conf.example](nginx.conf.example)** - Reverse proxy configuration

### Security

- **[Security Best Practices](SECURITY.md)** - Comprehensive security guide
  - Webhook signature verification
  - Secret management
  - Network security
  - Rate limiting
  - Access control

### Operations

- **[Monitoring Guide](MONITORING.md)** - Observability and monitoring
  - Metrics and dashboards
  - Logging strategies
  - Alerting configuration
  - Troubleshooting

### Development

- **[CHANGELOG](CHANGELOG.md)** - Version history and updates
- **[Package.json](package.json)** - Dependencies and scripts

### Utilities

- **[scripts/test-webhook.ts](scripts/test-webhook.ts)** - Webhook testing script
- **[scripts/generate-secret.ts](scripts/generate-secret.ts)** - Secret generation utility

## Project Structure

```
webhook-server/
├── src/
│   ├── index.ts                    # Main application
│   ├── routes/
│   │   ├── webhooks.ts            # Webhook endpoints
│   │   └── analytics.ts           # Analytics endpoints
│   ├── middleware/
│   │   ├── validateSignature.ts   # Signature verification
│   │   └── ipAllowlist.ts         # IP filtering
│   ├── services/
│   │   ├── database.ts            # Database operations
│   │   └── eventHandler.ts        # Event processing
│   ├── types/
│   │   └── webhook.ts             # TypeScript types
│   └── utils/
│       ├── crypto.ts              # Cryptographic utilities
│       └── logger.ts              # Logging utilities
├── scripts/                        # Utility scripts
├── docs/                          # Documentation
├── Dockerfile                     # Container configuration
├── docker-compose.yml             # Docker Compose setup
└── package.json                   # Project dependencies

Documentation Files:
├── README.md                      # Main documentation
├── QUICKSTART.md                  # Quick start guide
├── DEPLOYMENT.md                  # Deployment guide
├── SECURITY.md                    # Security guide
├── MONITORING.md                  # Monitoring guide
├── CHANGELOG.md                   # Version history
└── index.md                       # This file
```

## Key Features

### Webhook Endpoints

- `POST /webhooks/verification` - Verification and age verification events
- `POST /webhooks/revocation` - Revocation and expiration events

### Event Types Supported

1. **VERIFICATION_SUCCESS** - Credential verified successfully
2. **VERIFICATION_FAILED** - Credential verification failed
3. **CREDENTIAL_REVOKED** - Credential was revoked
4. **CREDENTIAL_EXPIRED** - Credential has expired
5. **AGE_VERIFICATION_PASSED** - Age verification succeeded
6. **AGE_VERIFICATION_FAILED** - Age verification failed

### Analytics Endpoints

- `GET /analytics` - Overall statistics
- `GET /analytics/events/:id` - Get specific event
- `GET /analytics/events/type/:eventType` - Events by type
- `GET /analytics/events/recent` - Recent events
- `DELETE /analytics/events/old` - Delete old events (admin)

### Security Features

- HMAC-SHA256 signature verification
- IP allowlisting
- Rate limiting
- Request validation with Zod
- Security headers with Helmet
- Constant-time signature comparison

### Database

- SQLite with WAL mode
- Event persistence and querying
- Analytics and reporting
- Automatic schema initialization
- Event cleanup utilities

### Production Ready

- Docker and Docker Compose support
- Kubernetes manifests
- Health check endpoints
- Structured logging with Winston
- Graceful shutdown handling
- Error recovery

## Common Tasks

### Initial Setup

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Generate secrets
npm run generate:secret

# 3. Update .env with generated secrets
nano .env

# 4. Start development server
npm run dev

# Or start with Docker
docker-compose up -d
```

### Testing Webhooks

```bash
# Run test script
npm run test:webhook

# Or manually with curl
curl -X POST http://localhost:3000/webhooks/verification \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=..." \
  -d '{"id":"test","timestamp":"2024-01-15T10:00:00Z",...}'
```

### Viewing Analytics

```bash
# Overall analytics
curl http://localhost:3000/analytics | jq

# Recent events
curl http://localhost:3000/analytics/events/recent?limit=10 | jq

# Events by type
curl http://localhost:3000/analytics/events/type/VERIFICATION_SUCCESS | jq
```

### Managing Data

```bash
# Delete old events (requires ADMIN_API_KEY)
curl -X DELETE "http://localhost:3000/analytics/events/old?days=30" \
  -H "X-API-Key: your-admin-api-key"
```

### Deployment

```bash
# Docker deployment
docker-compose up -d

# Kubernetes deployment
kubectl apply -f k8s/

# AWS ECS deployment
# See DEPLOYMENT.md for details

# Google Cloud Run
gcloud run deploy webhook-server --image gcr.io/project/webhook-server
```

### Monitoring

```bash
# View logs
docker-compose logs -f webhook-server

# Health check
curl http://localhost:3000/health

# Check metrics (if Prometheus is configured)
curl http://localhost:3000/metrics
```

## Environment Setup by Use Case

### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
RATE_LIMIT_MAX_REQUESTS=10000
ALLOWED_IPS=
WEBHOOK_SECRET=dev-secret-change-this
```

### Staging

```env
NODE_ENV=staging
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=500
ALLOWED_IPS=<staging-aura-ips>
WEBHOOK_SECRET=<strong-random-secret>
```

### Production

```env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=1000
ALLOWED_IPS=<production-aura-ips>
WEBHOOK_SECRET=<strong-random-secret>
ADMIN_API_KEY=<strong-random-key>
```

## Troubleshooting Quick Reference

| Issue                        | Solution                       | Documentation                                                             |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| Signature verification fails | Check WEBHOOK_SECRET matches   | [SECURITY.md](SECURITY.md#webhook-signature-verification)                 |
| High memory usage            | Delete old events              | [MONITORING.md](MONITORING.md#troubleshooting)                            |
| Rate limit errors            | Adjust RATE_LIMIT_MAX_REQUESTS | [README.md](README.md#configuration)                                      |
| Database locked              | Enable WAL mode (default)      | [README.md](README.md#database-integration-example-sqlite-for-simplicity) |
| Container won't start        | Check logs and environment     | [DEPLOYMENT.md](DEPLOYMENT.md#docker-deployment)                          |

## Support and Resources

### Documentation

- **Main README**: Comprehensive feature and API documentation
- **Quick Start**: Get running in minutes
- **Security Guide**: Production security best practices
- **Monitoring Guide**: Observability and troubleshooting
- **Deployment Guide**: Deploy to any platform

### Getting Help

- **GitHub Issues**: https://github.com/aura-network/aura-verifier-sdk/issues
- **Documentation**: https://docs.aurablockchain.org
- **Security Issues**: security@aurablockchain.org

### Additional Resources

- [Aura Network Website](https://aurablockchain.org)
- [Webhook Best Practices](https://webhooks.fyi/)
- [Express.js Documentation](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## Next Steps

1. **[Read the Quick Start Guide](QUICKSTART.md)** to get the server running
2. **[Review Security Best Practices](SECURITY.md)** before deploying
3. **[Set up Monitoring](MONITORING.md)** for production visibility
4. **[Choose a Deployment Strategy](DEPLOYMENT.md)** that fits your infrastructure
5. **Implement your business logic** in `src/services/eventHandler.ts`

## License

MIT License - See [LICENSE](LICENSE) for details

## Contributing

Contributions are welcome! Please see the main repository's CONTRIBUTING.md for guidelines.

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
