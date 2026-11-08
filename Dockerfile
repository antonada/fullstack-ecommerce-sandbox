FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
COPY tests/package.json tests/
RUN npm ci -w web -w shared
COPY tsconfig.base.json ./
COPY shared shared
COPY web web
RUN npm run build -w web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
COPY tests/package.json tests/
RUN npm ci --omit=dev -w api -w shared
COPY shared shared
COPY api api
COPY --from=build /app/web/dist web/dist
USER node
EXPOSE 3000
CMD ["node", "api/src/server.ts"]
