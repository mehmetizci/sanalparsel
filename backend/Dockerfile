FROM node:18-bullseye

RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    curl \
    tzdata \
    bash \
    dumb-init

WORKDIR /app

COPY backend/package*.json ./

RUN npm install --omit=dev

COPY backend/src/ ./src/

RUN mkdir -p /app/tmp /app/output && \
    chmod 755 /app/tmp /app/output

ENV NODE_ENV=production
ENV PORT=8080
ENV FFMPEG_THREADS=1

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["dumb-init", "node", "src/server.js"]