# Imagen base ligera
FROM node:20-slim

# Instalar dependencias necesarias para Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Crear usuario no root (importante para puppeteer)
RUN useradd -m pptruser

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Variable para puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

USER pptruser

EXPOSE 3000

CMD ["node", "server.js"]