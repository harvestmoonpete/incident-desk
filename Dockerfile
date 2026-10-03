FROM node:22.14.0-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_MODE=live
ARG VITE_BASE=/
ENV VITE_MODE=$VITE_MODE VITE_BASE=$VITE_BASE
RUN npm run build
FROM nginx:1.27.4-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
HEALTHCHECK CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
