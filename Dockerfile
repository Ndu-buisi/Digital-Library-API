FROM node:16.14.0

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY tests/ ./tests/

# Create uploads directory with restricted permissions
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

# FIX: Run as a non-root user for least-privilege execution
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 3000

# FIX: Add HEALTHCHECK instruction
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# FIX: Add USER instruction (already set above)
CMD ["node", "src/server.js"]
