# Simpler Dockerfile for Railway
# Uses @ffmpeg-installer which works within Railway memory limits

FROM node:18-alpine

RUN apk add --no-cache \
    ffmpeg \
    ca-certificates \
    curl \
    tzdata \
    bash \
    dumb-init

WORKDIR /app

COPY backend/package*.json ./

# Install dependencies
RUN npm ci --production --ignore-scripts

COPY backend/src/ ./src/

# Create directories
RUN mkdir -p /app/tmp /app/output && \
    chmod 755 /app/tmp /app/output

ENV NODE_ENV=production
ENV PORT=8080
ENV FFPEG_THREADS=1

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["dumb-init", "node", "src/server.js"]