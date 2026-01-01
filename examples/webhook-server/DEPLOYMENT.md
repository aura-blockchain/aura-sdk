# Deployment Guide

This guide covers various deployment options for the Aura Webhook Server in production environments.

## Table of Contents

1. [Docker Deployment](#docker-deployment)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Cloud Deployments](#cloud-deployments)
4. [Load Balancing](#load-balancing)
5. [Database Persistence](#database-persistence)
6. [Backup and Recovery](#backup-and-recovery)

## Docker Deployment

### Single Container

```bash
# Build image
docker build -t aura-webhook-server .

# Run container
docker run -d \
  --name webhook-server \
  -p 3000:3000 \
  -e WEBHOOK_SECRET=your-secret \
  -e NODE_ENV=production \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  aura-webhook-server
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f webhook-server

# Stop services
docker-compose down

# Update and restart
docker-compose pull
docker-compose up -d --force-recreate
```

### Multi-Container Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  webhook-server:
    image: aura-webhook-server:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    environment:
      - NODE_ENV=production
    networks:
      - webhook-net

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - webhook-server
    networks:
      - webhook-net

networks:
  webhook-net:
    driver: overlay
```

## Kubernetes Deployment

### Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: webhook-server
```

### Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: webhook-secrets
  namespace: webhook-server
type: Opaque
stringData:
  webhook-secret: "<your-webhook-secret>"
  admin-api-key: "<your-admin-api-key>"
```

Create secret:
```bash
kubectl apply -f secrets.yaml
```

### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: webhook-config
  namespace: webhook-server
data:
  PORT: "3000"
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "100"
```

### PersistentVolumeClaim

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: webhook-data-pvc
  namespace: webhook-server
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

### Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-server
  namespace: webhook-server
  labels:
    app: webhook-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webhook-server
  template:
    metadata:
      labels:
        app: webhook-server
    spec:
      containers:
      - name: webhook-server
        image: aura-webhook-server:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: webhook-config
              key: PORT
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: webhook-config
              key: NODE_ENV
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: webhook-secrets
              key: webhook-secret
        - name: ADMIN_API_KEY
          valueFrom:
            secretKeyRef:
              name: webhook-secrets
              key: admin-api-key
        - name: DATABASE_PATH
          value: "/app/data/webhooks.db"
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: webhook-data-pvc
      - name: logs
        emptyDir: {}
```

### Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: webhook-server-service
  namespace: webhook-server
spec:
  selector:
    app: webhook-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webhook-server-ingress
  namespace: webhook-server
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - webhooks.yourdomain.com
    secretName: webhook-tls
  rules:
  - host: webhooks.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webhook-server-service
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create secrets
kubectl apply -f secrets.yaml

# Create config
kubectl apply -f configmap.yaml

# Create PVC
kubectl apply -f pvc.yaml

# Deploy application
kubectl apply -f deployment.yaml

# Create service
kubectl apply -f service.yaml

# Create ingress
kubectl apply -f ingress.yaml

# Check status
kubectl get pods -n webhook-server
kubectl get svc -n webhook-server
kubectl get ingress -n webhook-server

# View logs
kubectl logs -f deployment/webhook-server -n webhook-server
```

### Horizontal Pod Autoscaling

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webhook-server-hpa
  namespace: webhook-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webhook-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Cloud Deployments

### AWS ECS (Elastic Container Service)

#### Task Definition

```json
{
  "family": "webhook-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "webhook-server",
      "image": "<account-id>.dkr.ecr.<region>.amazonaws.com/webhook-server:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        {
          "name": "WEBHOOK_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:webhook-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/webhook-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Deploy to ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -t webhook-server .
docker tag webhook-server:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/webhook-server:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/webhook-server:latest

# Create service
aws ecs create-service \
  --cluster webhook-cluster \
  --service-name webhook-server \
  --task-definition webhook-server:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/<project-id>/webhook-server

gcloud run deploy webhook-server \
  --image gcr.io/<project-id>/webhook-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets WEBHOOK_SECRET=webhook-secret:latest \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 60s
```

### Azure Container Instances

```bash
# Create resource group
az group create --name webhook-server-rg --location eastus

# Create container
az container create \
  --resource-group webhook-server-rg \
  --name webhook-server \
  --image aura-webhook-server:latest \
  --dns-name-label webhook-server \
  --ports 3000 \
  --environment-variables NODE_ENV=production PORT=3000 \
  --secure-environment-variables WEBHOOK_SECRET=<your-secret> \
  --cpu 1 \
  --memory 1 \
  --restart-policy Always
```

## Load Balancing

### Nginx Load Balancer

```nginx
upstream webhook_backend {
    least_conn;
    server webhook-server-1:3000 max_fails=3 fail_timeout=30s;
    server webhook-server-2:3000 max_fails=3 fail_timeout=30s;
    server webhook-server-3:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name webhooks.yourdomain.com;

    location / {
        proxy_pass http://webhook_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### HAProxy

```
frontend webhook_frontend
    bind *:443 ssl crt /etc/ssl/certs/webhook.pem
    default_backend webhook_backend

backend webhook_backend
    balance leastconn
    option httpchk GET /health
    server server1 webhook-server-1:3000 check
    server server2 webhook-server-2:3000 check
    server server3 webhook-server-3:3000 check
```

### Application Load Balancer (AWS)

```bash
# Create target group
aws elbv2 create-target-group \
  --name webhook-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --health-check-path /health \
  --health-check-interval-seconds 30

# Create load balancer
aws elbv2 create-load-balancer \
  --name webhook-lb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <lb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<tg-arn>
```

## Database Persistence

### Shared Database (Not Recommended)

For SQLite in multi-instance deployments, use network storage:

```yaml
# NFS volume
volumes:
  webhook-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server.example.com,rw
      device: ":/exports/webhook-data"
```

### PostgreSQL Migration (Recommended)

For production with multiple instances, migrate to PostgreSQL:

```typescript
// src/services/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/app/data/webhooks.db"

# Create backup
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/webhook_$DATE.db'"

# Compress
gzip $BACKUP_DIR/webhook_$DATE.db

# Upload to S3
aws s3 cp $BACKUP_DIR/webhook_$DATE.db.gz s3://webhook-backups/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "webhook_*.db.gz" -mtime +30 -delete
```

### Automated Backups

```yaml
# kubernetes cronjob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: webhook-backup
  namespace: webhook-server
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: alpine
            command:
            - /bin/sh
            - -c
            - |
              apk add sqlite
              sqlite3 /app/data/webhooks.db ".backup '/backups/webhook_$(date +%Y%m%d).db'"
            volumeMounts:
            - name: data
              mountPath: /app/data
            - name: backups
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: data
            persistentVolumeClaim:
              claimName: webhook-data-pvc
          - name: backups
            persistentVolumeClaim:
              claimName: webhook-backup-pvc
```

### Disaster Recovery

```bash
# Restore from backup
gunzip webhook_20240115.db.gz
cp webhook_20240115.db /app/data/webhooks.db

# Restart service
docker-compose restart webhook-server
# or
kubectl rollout restart deployment/webhook-server -n webhook-server
```

## Deployment Checklist

- [ ] Build and tag Docker image
- [ ] Push to container registry
- [ ] Configure secrets
- [ ] Set up persistent storage
- [ ] Configure load balancer
- [ ] Set up SSL/TLS certificates
- [ ] Configure DNS
- [ ] Set up monitoring
- [ ] Configure alerts
- [ ] Set up log aggregation
- [ ] Configure backups
- [ ] Test health checks
- [ ] Test webhooks
- [ ] Document deployment
- [ ] Create runbook
