#
# Simple container that runs the web demo together with the demo backend middleware.
#
FROM node:20-alpine
WORKDIR /app

# Workspace manifests
COPY package.json package-lock.json ./

# Required workspaces
COPY packages/dc-client packages/dc-client
COPY packages/dc-backend-demo packages/dc-backend-demo
COPY packages/digital-credentials packages/digital-credentials
COPY apps/web-demo apps/web-demo
COPY apps/config apps/config

RUN npm ci

# Build shared packages so local file: deps resolve to dist
RUN npm run build:backend && npm run build:client && npm run build:wc

ENV HOST=0.0.0.0
ENV PORT=80
EXPOSE 80

# Run Vite dev server with the demo backend plugin enabled
CMD ["npm", "run", "dev", "--workspace", "apps/web-demo", "--", "--host", "0.0.0.0", "--port", "80"]
