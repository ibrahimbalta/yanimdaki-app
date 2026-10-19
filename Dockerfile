# Playwright ve Node.js içeren resmi imajı kullan
FROM mcr.microsoft.com/playwright:v1.50.1-jammy

# Java (Allure Raporları için gerekli)
RUN apt-get update && \
    apt-get install -y openjdk-17-jre-headless && \
    rm -rf /var/lib/apt/lists/*

# Çalışma dizini
WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install

# Tüm dosyaları kopyala
COPY . .

# Portları aç (Dashboard: 3000, App: 5173)
EXPOSE 3000
EXPOSE 5173

# Test Center'ı başlat
CMD ["node", "scripts/test-center/server.js"]
