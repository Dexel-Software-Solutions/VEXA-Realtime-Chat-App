# Multi-stage Dockerfile for ChatApp Enterprise Backend API
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Final Lightweight Production Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app ./

EXPOSE 5000

CMD ["node", "server.js"]
