# Docker & AWS Deployment Guide

Comprehensive guide for containerizing and deploying the Complaint & Dispute Management Platform to AWS.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Docker Testing](#local-docker-testing)
- [Building Docker Image](#building-docker-image)
- [AWS Deployment](#aws-deployment)
  - [AWS ECS Fargate (Recommended)](#aws-ecs-fargate-recommended)
  - [AWS App Runner (Simplest)](#aws-app-runner-simplest)
  - [AWS EKS (Advanced)](#aws-eks-advanced)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Object Storage Migration](#object-storage-migration)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)
- [Production Checklist](#production-checklist)

## Overview

The application uses a **single-container architecture**:
- Multi-stage Docker build for optimized image size (~150MB)
- React frontend (TypeScript/TSX) compiled to static assets
- Express backend serves both API and static frontend
- External PostgreSQL database (Neon or AWS RDS)
- Object storage (Replit/GCS or AWS S3)

**Architecture**:
```
┌─────────────────────────────────────────┐
│         Docker Container                │
│  ┌────────────────────────────────┐    │
│  │   Express Server (Node.js)     │    │
│  │  - Serves static React app     │    │
│  │  - Handles API requests        │    │
│  │  - Port 5000                   │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   PostgreSQL            Object Storage
   (External)              (S3/GCS)
```

## Prerequisites

### Required Tools

- **Docker Desktop** (or Docker Engine) - [Install](https://docs.docker.com/get-docker/)
- **AWS CLI** v2 - [Install](https://aws.amazon.com/cli/)
- **AWS Account** with appropriate IAM permissions

### AWS IAM Permissions

Your AWS user/role needs:
- **ECR**: Push/pull container images
- **ECS**: Create/manage tasks and services
- **RDS**: Create/manage PostgreSQL (if not using Neon)
- **S3**: Create/manage buckets (for object storage)
- **IAM**: Create service roles
- **VPC**: Network configuration
- **CloudWatch**: Logs and monitoring

## Local Docker Testing

### Quick Test

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

2. **Access application**:
   - Application: `http://localhost:5000`
   - PostgreSQL: `localhost:5432` (if using local DB)

3. **View logs**:
   ```bash
   docker-compose logs -f app
   ```

4. **Stop services**:
   ```bash
   docker-compose down
   ```

### Using External Neon Database

If you want to test with your production Neon PostgreSQL:

```bash
# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
SESSION_SECRET=your-session-secret
PUBLIC_OBJECT_SEARCH_PATHS=gs://your-bucket/public
PRIVATE_OBJECT_DIR=gs://your-bucket/.private
EOF

# Start only the app (skip local PostgreSQL)
docker-compose up app
```

### Manual Docker Build

```bash
# Build image
docker build -t complaint-management:latest .

# Run container
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host/db" \
  -e SESSION_SECRET="your-secret" \
  complaint-management:latest

# Check health
curl http://localhost:5000/health
```

## Building Docker Image

### Production Build

```bash
# Build optimized production image
docker build -t complaint-management:v1.0.0 .

# Check image size (should be ~150-200MB)
docker images complaint-management:v1.0.0

# Test image locally
docker run -p 5000:5000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SESSION_SECRET="$SESSION_SECRET" \
  complaint-management:v1.0.0
```

### Multi-Architecture Build (Optional)

For ARM-based AWS instances (Graviton):

```bash
# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 \
  -t complaint-management:v1.0.0 .
```

## AWS Deployment

### AWS ECS Fargate (Recommended)

**Best for**: Production workloads with auto-scaling and high availability.

#### Step 1: Create ECR Repository

```bash
# Set variables
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME=complaint-management

# Create ECR repository
aws ecr create-repository \
  --repository-name $ECR_REPO_NAME \
  --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

#### Step 2: Build and Push Image

```bash
# Tag image for ECR
docker tag complaint-management:v1.0.0 \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:v1.0.0

# Push to ECR
docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:v1.0.0

# Tag as latest
docker tag complaint-management:v1.0.0 \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:latest

docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:latest
```

#### Step 3: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster \
  --cluster-name complaint-management-cluster \
  --region $AWS_REGION
```

#### Step 4: Create Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "complaint-management-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "complaint-management-app",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/complaint-management:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "5000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:complaint-db-url"
        },
        {
          "name": "SESSION_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:session-secret"
        },
        {
          "name": "MICROSOFT_CLIENT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:microsoft-client-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/complaint-management",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "app"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node -e \"require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\""],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 40
      }
    }
  ]
}
```

Register the task definition:

```bash
# Replace ACCOUNT_ID in the JSON file
sed -i "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" ecs-task-definition.json

# Create CloudWatch log group
aws logs create-log-group \
  --log-group-name /ecs/complaint-management \
  --region $AWS_REGION

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region $AWS_REGION
```

#### Step 5: Create Application Load Balancer

```bash
# Create security group for ALB
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name complaint-alb-sg \
  --description "Security group for complaint management ALB" \
  --vpc-id vpc-YOUR_VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

# Allow HTTP/HTTPS inbound
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name complaint-tg \
  --protocol HTTP \
  --port 5000 \
  --vpc-id vpc-YOUR_VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name complaint-alb \
  --subnets subnet-SUBNET1 subnet-SUBNET2 \
  --security-groups $ALB_SG_ID \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION
```

#### Step 6: Create ECS Service

```bash
# Create security group for ECS tasks
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name complaint-ecs-tasks-sg \
  --description "Security group for complaint management ECS tasks" \
  --vpc-id vpc-YOUR_VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 5000 \
  --source-group $ALB_SG_ID \
  --region $AWS_REGION

# Create ECS service
aws ecs create-service \
  --cluster complaint-management-cluster \
  --service-name complaint-management-service \
  --task-definition complaint-management-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-SUBNET1,subnet-SUBNET2],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=complaint-management-app,containerPort=5000" \
  --health-check-grace-period-seconds 60 \
  --region $AWS_REGION
```

#### Step 7: Configure Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/complaint-management-cluster/complaint-management-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10 \
  --region $AWS_REGION

# Create scaling policy (CPU-based)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/complaint-management-cluster/complaint-management-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json \
  --region $AWS_REGION
```

Create `scaling-policy.json`:

```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

### AWS App Runner (Simplest)

**Best for**: Quick deployments without managing infrastructure.

```bash
# Create App Runner service
aws apprunner create-service \
  --service-name complaint-management \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'$AWS_ACCOUNT_ID'.dkr.ecr.'$AWS_REGION'.amazonaws.com/complaint-management:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "5000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "5000"
        }
      }
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }' \
  --health-check-configuration '{
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }' \
  --region $AWS_REGION
```

### AWS EKS (Advanced)

For complex microservices architectures requiring Kubernetes orchestration.

See [AWS EKS Documentation](https://docs.aws.amazon.com/eks/latest/userguide/getting-started.html) for setup.

## Environment Configuration

### Required Environment Variables

Store sensitive values in **AWS Secrets Manager**:

```bash
# Database URL
aws secretsmanager create-secret \
  --name complaint-db-url \
  --secret-string "postgresql://user:password@host.neon.tech/dbname?sslmode=require" \
  --region $AWS_REGION

# Session secret
aws secretsmanager create-secret \
  --name session-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --region $AWS_REGION

# Microsoft SSO credentials
aws secretsmanager create-secret \
  --name microsoft-client-id \
  --secret-string "YOUR_CLIENT_ID" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name microsoft-client-secret \
  --secret-string "YOUR_CLIENT_SECRET" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name microsoft-tenant-id \
  --secret-string "YOUR_TENANT_ID" \
  --region $AWS_REGION
```

### Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Server port | `5000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `SESSION_SECRET` | Yes | Session encryption key | Random 32-byte string |
| `REPLIT_DOMAINS` | No | Allowed domains for Replit auth | `your-domain.com` |
| `MICROSOFT_CLIENT_ID` | No | Azure AD app client ID | `abc123...` |
| `MICROSOFT_CLIENT_SECRET` | No | Azure AD app secret | `xyz789...` |
| `MICROSOFT_TENANT_ID` | No | Azure AD tenant ID | `common` or tenant GUID |
| `MICROSOFT_REDIRECT_URI` | No | OAuth callback URL | `https://your-domain.com/api/auth/microsoft/callback` |
| `PUBLIC_OBJECT_SEARCH_PATHS` | No | Public object storage paths | `s3://bucket/public` or `gs://bucket/public` |
| `PRIVATE_OBJECT_DIR` | No | Private object storage directory | `s3://bucket/.private` or `gs://bucket/.private` |

## Database Setup

### Option 1: Continue Using Neon PostgreSQL

Your existing Neon database can be used without changes:

```bash
# Get connection string from Neon dashboard
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Add to AWS Secrets Manager (see above)
```

### Option 2: Migrate to AWS RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier complaint-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16.1 \
  --master-username postgres \
  --master-user-password "YOUR_SECURE_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-YOUR_SG \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --enable-iam-database-authentication \
  --region $AWS_REGION

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier complaint-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### Database Migration (Neon to RDS)

If migrating from Neon to RDS:

```bash
# Export from Neon
pg_dump "$NEON_DATABASE_URL" > backup.sql

# Import to RDS
psql "$RDS_DATABASE_URL" < backup.sql
```

## Object Storage Migration

### From Replit Object Storage (GCS) to AWS S3

#### Step 1: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://complaint-management-files --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket complaint-management-files \
  --versioning-configuration Status=Enabled

# Configure CORS (for uploads from browser)
aws s3api put-bucket-cors \
  --bucket complaint-management-files \
  --cors-configuration file://cors.json
```

Create `cors.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-domain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

#### Step 2: Copy Existing Files

```bash
# Install gsutil (Google Cloud SDK)
# See: https://cloud.google.com/storage/docs/gsutil_install

# Copy public files
gsutil -m cp -r gs://your-replit-bucket/public/* s3://complaint-management-files/public/

# Copy private files
gsutil -m cp -r gs://your-replit-bucket/.private/* s3://complaint-management-files/.private/
```

#### Step 3: Update Code for S3

The application uses `@google-cloud/storage`. To use S3, update to AWS SDK:

**Install AWS SDK**:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Update `server/objectStorage.ts`** to use S3 instead of GCS:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET_NAME = "complaint-management-files";

// Upload file
export async function uploadFile(key: string, buffer: Buffer, contentType: string) {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

// Generate signed URL for download
export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
```

#### Step 4: Update Environment Variables

```bash
# Update to S3 paths
PUBLIC_OBJECT_SEARCH_PATHS=s3://complaint-management-files/public
PRIVATE_OBJECT_DIR=s3://complaint-management-files/.private
AWS_REGION=us-east-1
```

#### Step 5: IAM Permissions

Ensure ECS task role has S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::complaint-management-files/*",
        "arn:aws:s3:::complaint-management-files"
      ]
    }
  ]
}
```

## Monitoring & Logging

### CloudWatch Logs

View application logs:

```bash
# View latest logs
aws logs tail /ecs/complaint-management --follow --region $AWS_REGION

# Search for errors
aws logs filter-log-events \
  --log-group-name /ecs/complaint-management \
  --filter-pattern "ERROR" \
  --region $AWS_REGION
```

### CloudWatch Metrics

Create dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name complaint-management \
  --dashboard-body file://dashboard.json \
  --region $AWS_REGION
```

### Health Checks

The application exposes a health endpoint at `/health`:

```bash
# Test health endpoint
curl https://your-alb-url.amazonaws.com/health

# Expected response
{"status":"ok","timestamp":"2025-11-06T12:00:00.000Z"}
```

### Alarms

Create CloudWatch alarms:

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name complaint-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --region $AWS_REGION

# High memory alarm
aws cloudwatch put-metric-alarm \
  --alarm-name complaint-high-memory \
  --alarm-description "Alert when memory exceeds 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --region $AWS_REGION
```

## Troubleshooting

### Container Won't Start

**Check logs**:
```bash
aws logs tail /ecs/complaint-management --follow --region $AWS_REGION
```

**Common issues**:
- Missing environment variables
- Database connection failure
- Incorrect port binding

**Debug with exec**:
```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster complaint-management-cluster \
  --service-name complaint-management-service \
  --query 'taskArns[0]' \
  --output text \
  --region $AWS_REGION)

# Execute shell in container
aws ecs execute-command \
  --cluster complaint-management-cluster \
  --task $TASK_ARN \
  --container complaint-management-app \
  --interactive \
  --command "/bin/sh" \
  --region $AWS_REGION
```

### Health Check Failures

**Verify health endpoint**:
```bash
# Test locally
docker run -p 5000:5000 complaint-management:latest
curl http://localhost:5000/health
```

**Check ALB target health**:
```bash
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $AWS_REGION
```

### Database Connection Issues

**Test connection**:
```bash
# From ECS task
psql "$DATABASE_URL" -c "SELECT version();"
```

**Common fixes**:
- Check security group allows inbound from ECS tasks
- Verify DATABASE_URL is correct
- Ensure SSL mode is configured (`?sslmode=require`)

### High Memory Usage

**Analyze memory**:
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --start-time 2025-11-06T00:00:00Z \
  --end-time 2025-11-06T23:59:59Z \
  --period 3600 \
  --statistics Average \
  --region $AWS_REGION
```

**Solutions**:
- Increase task memory allocation
- Check for memory leaks
- Optimize database queries

## Production Checklist

### Security

- [ ] Secrets stored in AWS Secrets Manager (not environment variables)
- [ ] HTTPS enabled (use ACM certificate with ALB)
- [ ] Security groups restrict access appropriately
- [ ] IAM roles follow least-privilege principle
- [ ] Container runs as non-root user (already configured)
- [ ] Database uses SSL/TLS connections
- [ ] S3 bucket has appropriate ACLs
- [ ] Enable AWS WAF on ALB (optional)

### Reliability

- [ ] Auto-scaling configured (min 2 tasks)
- [ ] Health checks working correctly
- [ ] Database backups enabled (Neon or RDS)
- [ ] Multi-AZ deployment for ECS tasks
- [ ] CloudWatch alarms configured
- [ ] Log retention set appropriately
- [ ] Disaster recovery plan documented

### Performance

- [ ] Database connection pooling configured
- [ ] Static assets served with appropriate caching headers
- [ ] CloudFront CDN for static assets (optional)
- [ ] Database indexes optimized
- [ ] Query performance monitored

### Monitoring

- [ ] CloudWatch logs streaming correctly
- [ ] Metrics dashboard created
- [ ] Alarms for CPU, memory, errors
- [ ] APM/tracing configured (optional: AWS X-Ray)
- [ ] Uptime monitoring (optional: external service)

### Cost Optimization

- [ ] Right-sized task CPU/memory
- [ ] Auto-scaling prevents over-provisioning
- [ ] S3 lifecycle policies for old files
- [ ] CloudWatch log retention set to 30-90 days
- [ ] Reserved capacity for predictable workloads (optional)

## Deployment Commands Summary

```bash
# Build and push
docker build -t complaint-management:v1.0.0 .
docker tag complaint-management:v1.0.0 $ECR_URI:v1.0.0
docker push $ECR_URI:v1.0.0

# Update ECS service (rolling deployment)
aws ecs update-service \
  --cluster complaint-management-cluster \
  --service complaint-management-service \
  --force-new-deployment \
  --region $AWS_REGION

# Rollback to previous version
aws ecs update-service \
  --cluster complaint-management-cluster \
  --service complaint-management-service \
  --task-definition complaint-management-task:PREVIOUS_REVISION \
  --region $AWS_REGION

# Scale service
aws ecs update-service \
  --cluster complaint-management-cluster \
  --service complaint-management-service \
  --desired-count 4 \
  --region $AWS_REGION
```

## Additional Resources

- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [CloudWatch Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## Support

For issues or questions:
- Check application logs in CloudWatch
- Review AWS service health dashboard
- Contact your DevOps team
- Refer to internal runbooks

---

**Last Updated**: November 2025  
**Version**: 1.0.0
