FROM node:22.14.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY service ./service
CMD ["node","--import","tsx","service/server.ts"]
