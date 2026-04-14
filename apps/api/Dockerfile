FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all app code
COPY . .

# Install pnpm and dependencies
RUN npm install -g pnpm@latest && pnpm install --frozen-lockfile

# Build the API
RUN pnpm --filter @zeus/api build

# Expose port
EXPOSE 3001

# Start the API
CMD ["pnpm", "--filter", "@zeus/api", "start:prod"]
