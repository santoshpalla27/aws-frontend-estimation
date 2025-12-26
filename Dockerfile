# Pricing Pipeline - Build Stage
FROM node:20-alpine AS pricing-builder

WORKDIR /app/pricing-pipeline

# Copy pricing pipeline files
COPY pricing-pipeline/package*.json ./
RUN npm ci --only=production

COPY pricing-pipeline/ ./

# Create output directory and run pricing pipeline
RUN mkdir -p /app/output/aws/v1/services && \
    npm run update-pricing || \
    (echo "Pricing pipeline failed, creating placeholder files" && \
    echo '{"service":"ec2","region":"us-east-1","currency":"USD","version":"v1","lastUpdated":"'$(date -Iseconds)'","instances":{}}' > /app/output/aws/v1/services/ec2.json && \
    echo '{"service":"vpc","region":"us-east-1","currency":"USD","version":"v1","lastUpdated":"'$(date -Iseconds)'","components":{"nat_gateway":{"hourly":0.045,"data_processing_per_gb":0.045},"igw":{"data_transfer":{"tiers":[{"upTo":10240,"rate":0.09,"unit":"gb"},{"upTo":"Infinity","rate":0.05,"unit":"gb"}]}}}}' > /app/output/aws/v1/services/vpc.json)

# Frontend - Build Stage
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./

# Copy pricing data from pricing-builder
COPY --from=pricing-builder /app/pricing-pipeline/output/ ./public/pricing/

# Build frontend
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy pricing data
COPY --from=pricing-builder /app/pricing-pipeline/output/ /usr/share/nginx/html/pricing/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
