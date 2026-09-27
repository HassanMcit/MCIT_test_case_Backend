# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Create directory for persistent SQLite database
RUN mkdir -p /app/data
ENV DATABASE_FILE=/app/data/qa_test_suite.db

EXPOSE 3001

CMD ["node", "dist/main.js"]
