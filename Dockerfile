# Utiliser Node.js 18 LTS
FROM node:18-alpine

# Créer le répertoire de travail
WORKDIR /app

# Installer les dépendances système nécessaires
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++

# Copier les fichiers de configuration des dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Créer les répertoires nécessaires
RUN mkdir -p /app/data /app/uploads /app/logs

# Donner les permissions appropriées
RUN chmod -R 755 /app/data /app/uploads /app/logs

# Exposer les ports
EXPOSE 3000 8080

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/bot_config.db

# Script de démarrage
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Commande de démarrage
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]