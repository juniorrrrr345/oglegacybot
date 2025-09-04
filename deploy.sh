#!/bin/bash

# Script de déploiement pour VPS
# Usage: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="telegram-bot-admin"

echo "🚀 Déploiement du bot Telegram - Environnement: $ENVIRONMENT"

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Installation..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installé. Redémarrez votre session pour continuer."
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Installation..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installé."
fi

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env manquant. Copie du fichier exemple..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Configurez le fichier .env avec vos vraies valeurs avant de continuer!"
    echo "   - TELEGRAM_BOT_TOKEN"
    echo "   - ADMIN_PASSWORD"
    echo "   - SESSION_SECRET"
    echo "   - DOMAIN"
    read -p "Appuyez sur Entrée après avoir configuré le fichier .env..."
fi

# Créer les répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p data uploads logs ssl

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down || true

# Construire et démarrer les conteneurs
echo "🔨 Construction et démarrage des conteneurs..."
docker-compose up --build -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier l'état des conteneurs
echo "🔍 Vérification de l'état des conteneurs..."
docker-compose ps

# Afficher les logs
echo "📋 Affichage des logs récents..."
docker-compose logs --tail=20

# Instructions finales
echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📋 Informations importantes:"
echo "   - Panel admin: http://$(curl -s ifconfig.me):3000"
echo "   - Logs: docker-compose logs -f"
echo "   - Redémarrage: docker-compose restart"
echo "   - Arrêt: docker-compose down"
echo ""
echo "🔧 Configuration SSL (optionnel):"
echo "   1. Obtenez un certificat SSL (Let's Encrypt recommandé)"
echo "   2. Placez les fichiers dans ./ssl/"
echo "   3. Décommentez les lignes SSL dans nginx/conf.d/bot-admin.conf"
echo "   4. Redémarrez: docker-compose restart nginx"
echo ""
echo "⚠️  N'oubliez pas de:"
echo "   - Configurer votre domaine pour pointer vers cette IP"
echo "   - Ouvrir les ports 80 et 443 dans votre firewall"
echo "   - Sauvegarder régulièrement le dossier ./data"

# Test de connectivité
echo ""
echo "🧪 Test de connectivité..."
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Panel admin accessible localement"
else
    echo "❌ Problème de connectivité - vérifiez les logs"
    docker-compose logs telegram-bot
fi