FROM node:18-bullseye

# FFmpeg + gerekli sistem paketleri
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

# Backend structure fix (kritik)
COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

# Runtime klasörleri
RUN mkdir -p /app/tmp /app/output && \
    chmod 755 /app/tmp /app/output

# Environment
ENV NODE_ENV=production
ENV PORT=8080
ENV FFMPEG_THREADS=1

EXPOSE 8080

# Debug (istersen sonra silebilirsin)
RUN which ffmpeg && ffmpeg -version

# Start
CMD ["node", "src/server.js"]