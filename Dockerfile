FROM node:slim@sha256:0afb7822fac7bf9d7c1bf3b6e6c496dee6b2b64d8dfa365501a3c68e8eba94b2 AS build
RUN corepack enable
WORKDIR /app
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# to make gen-licenses work
RUN pnpm add tslib@$(cat pnpm-lock.yaml | grep tslib -m 1 | sed -E 's/.*tslib@(.*?):/\1/g')

RUN pnpm i -P

COPY . .
RUN pnpm run gen-licenses && pnpm run build

FROM node:slim@sha256:0afb7822fac7bf9d7c1bf3b6e6c496dee6b2b64d8dfa365501a3c68e8eba94b2
WORKDIR /app
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

COPY --from=build app/.output/ ./
EXPOSE 3000
ENV DOCKER=true
CMD ["node", "./server/index.mjs"]
