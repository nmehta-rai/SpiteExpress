# Stage 1: Build the monorepo
FROM node:22-alpine AS build
WORKDIR /app

# Copy monorepo root
COPY package.json package-lock.json turbo.json ./

# Copy all workspaces
COPY apps/ ./apps/
COPY packages/ ./packages/

# Install all dependencies (resolves workspace packages)
RUN npm install

# Build everything (turbo builds landing + its deps)
RUN npm run build

# Stage 2: Serve landing app with nginx
FROM nginx:stable-alpine
COPY --from=build /app/apps/landing/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
