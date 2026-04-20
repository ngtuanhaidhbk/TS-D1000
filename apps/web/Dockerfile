FROM node:22-alpine AS development
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install
COPY . .
WORKDIR /workspace/apps/web
CMD ["pnpm", "dev", "--", "--host", "0.0.0.0"]

FROM node:22-alpine AS builder
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install
COPY . .
RUN pnpm --filter web build

FROM nginx:1.27-alpine AS production
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
