# osCASH.me Mobile API Gateway Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Create non-root user for security
RUN addgroup -g 1001 -S oscash && \
    adduser -S oscash -u 1001

# Change ownership
RUN chown -R oscash:oscash /app
USER oscash

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/health-check.js

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]