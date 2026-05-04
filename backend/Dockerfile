FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --silent

# Copy source and frontend
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY frontend ./frontend

# Build TypeScript
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy production node_modules and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend ./frontend

EXPOSE 5000
CMD ["node", "dist/index.js"]
