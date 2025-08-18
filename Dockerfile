FROM node:16.14.0

# Running as root (security issue)
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including vulnerable ones
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY tests/ ./tests/

# Expose port
EXPOSE 3000

# Create uploads directory with overly permissive permissions
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Running as root user (security vulnerability)
CMD ["node", "src/server.js"]
