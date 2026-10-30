# syntax=docker/dockerfile:1
# Two stages: Node parses the two source lists, nginx serves the static page.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
COPY scripts ./scripts
COPY lib ./lib
COPY sources ./sources

RUN node scripts/build-data.mjs && node scripts/verify.mjs

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js styles.css /usr/share/nginx/html/
COPY lib /usr/share/nginx/html/lib
COPY --from=build /app/data /usr/share/nginx/html/data

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
