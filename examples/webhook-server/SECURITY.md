# Security Best Practices

This document outlines security best practices for deploying and operating the Aura Webhook Server in production.

## Table of Contents

1. [Webhook Signature Verification](#webhook-signature-verification)
2. [Secret Management](#secret-management)
3. [Network Security](#network-security)
4. [Rate Limiting](#rate-limiting)
5. [Access Control](#access-control)
6. [Logging and Monitoring](#logging-and-monitoring)
7. [Data Protection](#data-protection)
8. [Security Checklist](#security-checklist)

## Webhook Signature Verification

### How It Works

All webhook requests must include a valid signature in the `X-Webhook-Signature` header. The signature is calculated using HMAC-SHA256:

```typescript
signature = HMAC-SHA256(webhook_secret, request_body)
```

### Implementation

The server automatically verifies signatures using constant-time comparison to prevent timing attacks:

```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Best Practices

1. **Never log or expose the webhook secret**
2. **Use a strong, randomly generated secret** (at least 32 bytes)
3. **Rotate secrets periodically** (every 90 days recommended)
4. **Use different secrets for different environments** (dev, staging, production)
5. **Store secrets in environment variables**, never in code

### Testing Signatures

Generate test signatures:

```bash
echo -n '{"id":"test","timestamp":"2024-01-15T10:00:00Z"}' | \
  openssl dgst -sha256 -hmac "your-webhook-secret" | \
  awk '{print "sha256=" $2}'
```

## Secret Management

### Environment Variables

Store all secrets in environment variables:

```env
WEBHOOK_SECRET=<64-character-hex-string>
ADMIN_API_KEY=<64-character-hex-string>
```

### Secret Generation

Generate strong secrets:

```bash
# Generate webhook secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

### Secret Rotation

When rotating secrets:

1. Generate new secret
2. Configure Aura Network with new secret
3. Support both old and new secrets temporarily
4. Update server with new secret
5. Remove old secret after verification period

### Using Secret Managers

#### AWS Secrets Manager

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });
const secret = await client.send(new GetSecretValueCommand({
  SecretId: "webhook/secret"
}));

process.env.WEBHOOK_SECRET = secret.SecretString;
```

#### HashiCorp Vault

```bash
# Store secret
vault kv put secret/webhook secret=<generated-secret>

# Retrieve secret
vault kv get -field=secret secret/webhook
```

#### Google Secret Manager

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/PROJECT_ID/secrets/webhook-secret/versions/latest',
});

process.env.WEBHOOK_SECRET = version.payload.data.toString();
```

## Network Security

### HTTPS/TLS

**ALWAYS use HTTPS in production**. Never accept unencrypted webhook traffic.

```nginx
# Force HTTPS redirect
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ...
}
```

### IP Allowlisting

Restrict webhook requests to Aura Network IPs:

```env
# .env
ALLOWED_IPS=192.168.1.100,10.0.0.50,172.16.0.1
```

The middleware will reject requests from other IPs:

```typescript
if (!allowedIps.includes(clientIp)) {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'IP address not allowed'
  });
}
```

### Firewall Rules

Configure firewall to restrict access:

```bash
# iptables example
iptables -A INPUT -p tcp --dport 3000 -s <aura-network-ip> -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP

# UFW example
ufw allow from <aura-network-ip> to any port 3000
ufw deny 3000
```

### VPN/Private Network

For maximum security, deploy the webhook server in a private network and use VPN:

```yaml
# docker-compose.yml with custom network
networks:
  webhook-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Rate Limiting

### Application-Level Rate Limiting

Configured in `.env`:

```env
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100     # 100 requests per window
```

### Nginx Rate Limiting

Additional protection at reverse proxy level:

```nginx
# Define rate limit zone
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=10r/s;

# Apply to webhook endpoints
location /webhooks/ {
    limit_req zone=webhook_limit burst=20 nodelay;
    ...
}
```

### DDoS Protection

For production deployments:

1. **Use CDN with DDoS protection** (Cloudflare, AWS CloudFront)
2. **Implement connection limits**
3. **Configure SYN flood protection**
4. **Use fail2ban** to block malicious IPs

```bash
# fail2ban configuration
[webhook-brute]
enabled = true
filter = webhook-brute
logpath = /var/log/webhook-server.log
maxretry = 5
bantime = 3600
```

## Access Control

### Analytics Endpoints

Restrict analytics endpoints to internal networks:

```nginx
location /analytics/ {
    # Allow only internal IPs
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    deny all;

    proxy_pass http://webhook-server:3000;
}
```

### Admin Operations

Protect destructive operations with API key:

```typescript
const apiKey = req.headers['x-api-key'];
if (apiKey !== process.env.ADMIN_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Role-Based Access Control

For teams, implement RBAC:

```typescript
enum Role {
  VIEWER = 'viewer',    // Can view analytics
  OPERATOR = 'operator', // Can manage webhooks
  ADMIN = 'admin'        // Full access
}

function requireRole(role: Role) {
  return (req, res, next) => {
    if (!hasRole(req.user, role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

router.get('/analytics', requireRole(Role.VIEWER), ...);
router.delete('/events', requireRole(Role.ADMIN), ...);
```

## Logging and Monitoring

### Secure Logging

1. **Never log sensitive data** (secrets, credentials, PII)
2. **Sanitize logs** before storing
3. **Encrypt log files** at rest
4. **Rotate logs** regularly

```typescript
// Bad - logs sensitive data
logger.info('Webhook received', { secret: process.env.WEBHOOK_SECRET });

// Good - logs only necessary info
logger.info('Webhook received', { eventId, eventType });
```

### Audit Logging

Track all security-relevant events:

```typescript
// Failed signature verification
logger.warn('Signature verification failed', {
  eventId,
  sourceIp,
  timestamp: new Date().toISOString()
});

// Unauthorized access attempt
logger.warn('Unauthorized access attempt', {
  path: req.path,
  sourceIp: req.ip,
  headers: req.headers
});
```

### Monitoring Alerts

Set up alerts for:

- **High rate of signature verification failures**
- **Requests from unexpected IPs**
- **Unusual traffic patterns**
- **Database errors**
- **Server errors (5xx responses)**

```yaml
# Example Prometheus alert rules
groups:
  - name: webhook_alerts
    rules:
      - alert: HighFailureRate
        expr: rate(webhook_signature_failures[5m]) > 10
        annotations:
          summary: "High rate of signature verification failures"

      - alert: UnauthorizedAccess
        expr: rate(webhook_unauthorized_requests[5m]) > 5
        annotations:
          summary: "High rate of unauthorized access attempts"
```

## Data Protection

### Database Security

1. **Encrypt database at rest**
2. **Use strong file permissions**
3. **Regular backups**
4. **Backup encryption**

```bash
# Set restrictive permissions
chmod 600 data/webhooks.db

# Encrypt backups
tar czf - data/ | gpg --encrypt --recipient admin@example.com > backup.tar.gz.gpg
```

### Data Retention

Delete old data to minimize risk:

```bash
# Delete events older than 30 days
curl -X DELETE http://localhost:3000/analytics/events/old?days=30 \
  -H "X-API-Key: ${ADMIN_API_KEY}"
```

### PII Handling

If webhooks contain PII:

1. **Minimize data collection**
2. **Encrypt PII fields**
3. **Implement data retention policies**
4. **Provide data deletion mechanisms**
5. **Comply with GDPR/CCPA**

## Security Checklist

### Pre-Deployment

- [ ] Generate strong webhook secret (32+ bytes)
- [ ] Configure HTTPS/TLS certificates
- [ ] Set up IP allowlisting
- [ ] Configure rate limiting
- [ ] Enable security headers
- [ ] Set restrictive file permissions
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Review and sanitize logs
- [ ] Configure backup strategy

### Post-Deployment

- [ ] Test signature verification
- [ ] Verify HTTPS is enforced
- [ ] Confirm IP allowlist works
- [ ] Test rate limiting
- [ ] Monitor for errors
- [ ] Review access logs
- [ ] Test backup/restore
- [ ] Document incident response plan

### Regular Maintenance

- [ ] Rotate secrets (every 90 days)
- [ ] Update dependencies (monthly)
- [ ] Review access logs (weekly)
- [ ] Test disaster recovery (quarterly)
- [ ] Security audit (annually)
- [ ] Penetration testing (annually)
- [ ] Delete old events (monthly)
- [ ] Review and update documentation

## Incident Response

### If Webhook Secret is Compromised

1. **Immediately generate new secret**
2. **Coordinate with Aura Network** to update their configuration
3. **Deploy new secret** to production
4. **Monitor for unauthorized webhooks**
5. **Review logs** for suspicious activity
6. **Document incident** for post-mortem

### If Unauthorized Access Detected

1. **Block malicious IPs** immediately
2. **Review access logs** for scope of breach
3. **Check database** for unauthorized modifications
4. **Rotate all secrets**
5. **Notify stakeholders**
6. **Document and report** incident

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls)
- [Webhook Security Best Practices](https://webhooks.fyi/security)

## Contact

For security issues, please contact: security@aurablockchain.org
