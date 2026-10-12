# Web app served by nginx (ghcr.io/jesuisundesdeux/vigilo-webapp), used by vigilo-demo.
# Optional config.json next to index.html: {"conf_url": "..."} (see doc/GUIDE_CODE.md).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY webpack.config.js ./
COPY webpack ./webpack
COPY src ./src
RUN WEBPACK_MODE=production npm run webpack

FROM nginx:1.28-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
