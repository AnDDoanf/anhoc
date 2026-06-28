FROM node:22-alpine

# Install runtime dependencies for Prisma and diagnostics
RUN apk add --no-cache openssl curl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Generate the Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5001) + '/api/v1/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
