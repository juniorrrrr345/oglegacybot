#!/bin/sh

# Script de démarrage pour le conteneur Docker

echo "🚀 Démarrage du bot Telegram avec panel admin..."

# Vérifier que les variables d'environnement sont définies
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ ERREUR: TELEGRAM_BOT_TOKEN n'est pas défini"
    exit 1
fi

# Créer les répertoires nécessaires s'ils n'existent pas
mkdir -p /app/data /app/uploads /app/logs

# Initialiser la base de données si elle n'existe pas
if [ ! -f "/app/data/bot_config.db" ]; then
    echo "📦 Initialisation de la base de données..."
    node /app/src/setup-database.js
fi

# Attendre quelques secondes pour s'assurer que tout est prêt
sleep 2

echo "✅ Configuration terminée, démarrage des services..."

# Exécuter la commande passée en paramètre
exec "$@"