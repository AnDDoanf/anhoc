FROM node:22-alpine

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Generate the Prisma Client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=35s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
