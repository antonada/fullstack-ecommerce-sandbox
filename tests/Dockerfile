FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
COPY tests/package.json tests/
RUN npm ci -w tests -w shared
RUN npx playwright install --with-deps chromium firefox
COPY tsconfig.base.json ./
COPY shared shared
COPY tests tests
WORKDIR /app/tests
CMD ["npx", "playwright", "test"]
