FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends gosu ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build && npm prune --omit=dev && mkdir -p /app/.local /data && chmod +x scripts/container-entrypoint.sh
ENV NODE_ENV=production BIND_HOST=0.0.0.0 PORT=3000 DEMO_DATABASE=/data/second-look.sqlite
EXPOSE 3000
ENTRYPOINT ["/app/scripts/container-entrypoint.sh"]
CMD ["node", "--import", "tsx", "server/index.ts"]
