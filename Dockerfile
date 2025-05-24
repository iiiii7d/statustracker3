FROM node:24-alpine AS build

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm i

COPY . .
RUN pnpm run build

FROM node:24-alpine

COPY --from=build .output/ ./
EXPOSE 3000
CMD ["node", "./server/index.mjs"]
