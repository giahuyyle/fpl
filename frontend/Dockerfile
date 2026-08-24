FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && sha256sum package-lock.json > node_modules/.package-lock.sha256

COPY . .

EXPOSE 5173

CMD ["sh", "./scripts/start-dev.sh"]
