#
# Multi-stage build for the web demo.
# 1) Build the monorepo packages and the web demo.
# 2) Serve the built assets from nginx.
#

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY packages/dc-client packages/dc-client
COPY packages/dc-mock-utils packages/dc-mock-utils
COPY packages/digital-credentials packages/digital-credentials
COPY apps/web-demo apps/web-demo
COPY apps/config apps/config
COPY fixtures fixtures

RUN npm ci

# Build shared packages and the web demo
RUN npm run build
RUN npm run build --workspace apps/web-demo

FROM nginx:alpine AS runner
LABEL org.opencontainers.image.source="https://github.com/walt-id/waltid-digital-credentials-button"
LABEL org.opencontainers.image.description="walt.id digital credentials web demo"

COPY --from=builder /app/apps/web-demo/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
