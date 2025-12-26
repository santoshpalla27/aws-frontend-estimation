# AWS Cost Estimator - Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available for Docker
- Internet connection for downloading AWS pricing data

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at `http://localhost:3000`

### 2. What Happens During Build

1. **Pricing Pipeline Stage**:
   - Downloads AWS EC2 pricing (~150MB)
   - Downloads AWS VPC pricing
   - Normalizes and validates pricing data
   - Generates versioned JSON files

2. **Frontend Build Stage**:
   - Installs dependencies
   - Copies pricing data
   - Builds React application
   - Creates optimized production bundle

3. **Production Stage**:
   - Serves application with Nginx
   - Enables gzip compression
   - Caches static assets

### 3. Manual Build (Without Docker)

#### Pricing Pipeline

```bash
cd pricing-pipeline
npm install
npm run update-pricing
```

This will:
- Download AWS pricing data to `raw/`
- Process and normalize data
- Output to `output/aws/v1/services/`

#### Frontend

```bash
npm install
npm run dev  # Development mode

# OR

npm run build  # Production build
npm run preview  # Preview production build
```

## Docker Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Pricing pipeline only
docker-compose logs pricing-pipeline

# Frontend only
docker-compose logs frontend
```

### Rebuild Pricing Data

```bash
# Stop services
docker-compose down

# Remove pricing volume
docker volume rm aws-frontend_pricing-data

# Rebuild
docker-compose up --build
```

### Stop Services

```bash
docker-compose down

# Remove volumes as well
docker-compose down -v
```

## Environment Variables

### Pricing Pipeline

- `NODE_ENV`: Set to `production`
- `NODE_OPTIONS`: Set to `--max-old-space-size=4096` for large file processing

### Frontend

- No environment variables required for basic setup

## Troubleshooting

### Pricing Pipeline Fails

**Symptom**: Pricing pipeline container exits with error

**Solutions**:
1. Check available memory: `docker stats`
2. Increase Docker memory limit to at least 4GB
3. Check internet connection
4. View logs: `docker-compose logs pricing-pipeline`

### Frontend Shows "Failed to load pricing data"

**Symptom**: Error message in browser

**Solutions**:
1. Ensure pricing pipeline completed successfully
2. Check pricing data exists: `docker-compose exec frontend ls /usr/share/nginx/html/pricing/aws/v1/services/`
3. Rebuild with: `docker-compose up --build`

### Port 3000 Already in Use

**Solution**:
```bash
# Edit docker-compose.yml and change port mapping
ports:
  - "8080:80"  # Use port 8080 instead
```

## Production Deployment

### AWS ECS/Fargate

1. Push images to ECR:
```bash
# Build and tag
docker build -t aws-cost-estimator .
docker tag aws-cost-estimator:latest <account-id>.dkr.ecr.<region>.amazonaws.com/aws-cost-estimator:latest

# Push
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/aws-cost-estimator:latest
```

2. Create ECS task definition with:
   - 4GB memory
   - 2 vCPU
   - Port 80 exposed

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aws-cost-estimator
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aws-cost-estimator
  template:
    metadata:
      labels:
        app: aws-cost-estimator
    spec:
      containers:
      - name: frontend
        image: aws-cost-estimator:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: aws-cost-estimator
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: aws-cost-estimator
```

## Updating Pricing Data

### Automated Updates

Set up a cron job to rebuild pricing data monthly:

```bash
# crontab -e
0 0 1 * * cd /path/to/aws-frontend && docker-compose up pricing-pipeline
```

### Manual Updates

```bash
# Rebuild pricing data only
docker-compose run pricing-pipeline npm run update-pricing

# Restart frontend to pick up new data
docker-compose restart frontend
```

## Performance Optimization

### Nginx Caching

The included `nginx.conf` already enables:
- Gzip compression
- Static asset caching (1 year)
- Pricing data caching (1 hour)

### CDN Integration

For production, consider using a CDN:
1. Upload pricing data to S3
2. Configure CloudFront distribution
3. Update frontend to fetch from CDN

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

Should return: `healthy`

### Metrics

Monitor:
- Container memory usage
- Response times
- Pricing data freshness

## Security

### Best Practices

1. **HTTPS**: Use reverse proxy (nginx, Traefik) with Let's Encrypt
2. **CORS**: Configure if API is separate
3. **CSP**: Add Content Security Policy headers
4. **Updates**: Regularly update dependencies

### Example Reverse Proxy (Traefik)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.cost-estimator.rule=Host(`cost.example.com`)"
  - "traefik.http.routers.cost-estimator.entrypoints=websecure"
  - "traefik.http.routers.cost-estimator.tls.certresolver=letsencrypt"
```

## Backup

### Pricing Data

```bash
# Backup pricing volume
docker run --rm -v aws-frontend_pricing-data:/data -v $(pwd):/backup alpine tar czf /backup/pricing-backup.tar.gz /data

# Restore
docker run --rm -v aws-frontend_pricing-data:/data -v $(pwd):/backup alpine tar xzf /backup/pricing-backup.tar.gz -C /
```

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify pricing data: `ls pricing-pipeline/output/aws/v1/services/`
3. Test locally: `npm run dev`
4. Review implementation plan: `implementation_plan.md`
