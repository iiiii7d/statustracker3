FROM node:slim@sha256:3393543ad82b7ca5f9329c5115ad801f9e08b4d385f81a616cfb981c32e16c7b AS build
WORKDIR /app
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN apt-get update && apt-get install jq -y --no-install-recommends && apt-get clean
RUN npm i -g "$(cat package.json | jq -r '.packageManager')"

# to make gen-licenses work
RUN pnpm add "tslib@$(cat pnpm-lock.yaml | grep tslib -m 1 | sed -E 's/.*tslib@(.*?):/\1/g')"

RUN pnpm fetch -P

COPY . .
RUN pnpm run gen-licenses && pnpm run build

FROM node:slim@sha256:3393543ad82b7ca5f9329c5115ad801f9e08b4d385f81a616cfb981c32e16c7b
WORKDIR /app
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/* && \
  apt-get clean

COPY --from=build app/.output/ ./
EXPOSE 3000
ENV DOCKER=true
CMD ["node", "./server/index.mjs"]
