FROM node:24-alpine AS build

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i

COPY . .
RUN pnpm run gen-licenses && pnpm run build

FROM node:24-alpine

COPY --from=build .output/ ./
EXPOSE 3000
CMD ["node", "./server/index.mjs"]
