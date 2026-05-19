# Railway için stabil Node + FFmpeg setup
FROM node:18-bullseye

# System dependencies + FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    curl \
    tzdata \
    bash \
    dumb-init \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Package install
COPY backend/package*.json ./
RUN npm install --omit=dev

# App source
COPY backend/src/ ./src/

# Required folders
RUN mkdir -p /app/tmp /app/output && \
    chmod 755 /app/tmp /app/output

# Environment
ENV NODE_ENV=production
ENV PORT=8080
ENV FFMPEG_THREADS=1

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start app
CMD ["dumb-init", "node", "src/server.js"]