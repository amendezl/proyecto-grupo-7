FROM node:22-bullseye-slim
WORKDIR /app

# Install tini for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    tini \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY . .

EXPOSE 9000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "index.js"]
