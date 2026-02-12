FROM node:22-alpine

# Install git for cloning dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with legacy peer deps for React 19 compatibility
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

EXPOSE 3001
