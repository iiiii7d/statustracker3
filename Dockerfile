FROM node:trixie-slim@sha256:f3442599b9c4ee3ed64146b743b4b78c29d9e39d437ec6ca6f17a52fcd11d98e AS build
WORKDIR /app
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
# renovate: deb depName=jq
ENV JQ_VERSION="1.7.1-6+deb13u1"

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN apt-get update && apt-get install -y --no-install-recommends \
   jq="${JQ_VERSION}" \
   && rm -r /var/lib/apt/lists/* && apt-get clean
RUN npm i -g "$(cat package.json | jq -r '.packageManager')"

# to make gen-licenses work
RUN pnpm add "tslib@$(cat pnpm-lock.yaml | grep tslib -m 1 | sed -E 's/.*tslib@(.*?):/\1/g')"

RUN pnpm fetch -P

COPY . .
RUN pnpm run gen-licenses && pnpm run build

FROM node:trixie-slim@sha256:f3442599b9c4ee3ed64146b743b4b78c29d9e39d437ec6ca6f17a52fcd11d98e
WORKDIR /app
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
# renovate: deb depName=gnupg
ENV GNUPG_VERSION="2.4.7-21+deb13u1"
# renovate: deb depName=wget
ENV WGET_VERSION="1.25.0-2"
# renovate: deb depName=ca-certificates
ENV CA_CERTIFICATES_VERSION="20250419"

RUN apt-get update && apt-get install -y --no-install-recommends gnupg="${GNUPG_VERSION}" wget="${WGET_VERSION}" ca-certificates="${CA_CERTIFICATES_VERSION}" && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/* && apt-get clean

COPY --from=build app/.output/ ./
EXPOSE 3000
ENV DOCKER=true
CMD ["node", "./server/index.mjs"]
