# 🤖 Bot Telegram avec Panel Administrateur

Un système complet de bot Telegram avec interface d'administration web, utilisant une base de données Cloudflare D1.

## 🌟 Fonctionnalités

### Bot Telegram
- ✅ Commande `/start` avec message personnalisable
- ✅ Commande `/config` avec boutons modulaires
- ✅ Gestion des réseaux sociaux
- ✅ Messages de diffusion
- ✅ Statistiques d'utilisation

### Panel Administrateur
- 🎨 Modifier le message d'accueil
- 🖼️ Modifier la photo d'accueil
- 📱 Configurer la mini application
- 🌐 Gérer les réseaux sociaux
- ℹ️ Modifier les informations du bot
- 📢 Envoyer des messages à tous les utilisateurs
- 👥 Gérer les administrateurs
- 📊 Voir les statistiques détaillées

## 🚀 Déploiement sur VPS

### Prérequis
- VPS avec Ubuntu/Debian
- Nom de domaine pointant vers votre VPS
- Token de bot Telegram (obtenu via @BotFather)

### Installation rapide

1. **Cloner le projet**
   ```bash
   git clone <votre-repo>
   cd telegram-bot-admin-panel
   ```

2. **Configuration**
   ```bash
   cp .env.example .env
   nano .env  # Configurez vos variables
   ```

3. **Déploiement automatique**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh production
   ```

### Configuration manuelle

1. **Variables d'environnement (.env)**
   ```env
   TELEGRAM_BOT_TOKEN=votre_token_bot
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=votre_mot_de_passe_securise
   DOMAIN=votre-domaine.com
   ```

2. **Démarrage avec Docker**
   ```bash
   docker-compose up -d
   ```

3. **Vérification**
   ```bash
   docker-compose logs -f
   ```

## 🔧 Configuration

### Nginx et SSL
- Modifiez `nginx/conf.d/bot-admin.conf`
- Pour SSL, placez vos certificats dans `./ssl/`
- Redémarrez nginx: `docker-compose restart nginx`

### Base de données
- Base D1 Cloudflare: `fe5c3cd2-78a5-41c5-92b9-0d8648e61c22` (nom: botog)
- Sauvegarde locale dans `./data/`

## 📱 Utilisation

### Accès au panel admin
- URL: `http://votre-domaine.com` ou `http://IP:3000`
- Login: `admin` (ou votre ADMIN_USERNAME)
- Password: votre ADMIN_PASSWORD

### Commandes du bot
- `/start` - Message d'accueil
- `/config` - Panel de configuration avec boutons

## 🛠️ Développement

### Installation locale
```bash
npm install
cp .env.example .env
npm run setup-db
npm run dev
```

### Structure du projet
```
├── src/
│   ├── bot.js              # Bot Telegram principal
│   ├── admin-server.js     # Serveur web admin
│   ├── database.js         # Gestion base de données
│   └── setup-database.js   # Initialisation DB
├── views/                  # Templates EJS
├── public/                 # Assets statiques
├── nginx/                  # Configuration Nginx
├── data/                   # Base de données locale
├── uploads/                # Fichiers uploadés
└── logs/                   # Logs applicatifs
```

## 🔒 Sécurité

- Changez tous les mots de passe par défaut
- Utilisez HTTPS en production
- Sauvegardez régulièrement `./data/`
- Limitez l'accès SSH à votre VPS

## 📊 Monitoring

### Logs
```bash
# Logs du bot
docker-compose logs telegram-bot

# Logs nginx
docker-compose logs nginx

# Logs en temps réel
docker-compose logs -f
```

### Redémarrage
```bash
# Redémarrage complet
docker-compose restart

# Redémarrage du bot uniquement
docker-compose restart telegram-bot
```

## 🆘 Dépannage

### Problèmes courants
1. **Bot ne répond pas**: Vérifiez le token dans `.env`
2. **Panel inaccessible**: Vérifiez les ports ouverts (80, 443)
3. **Base de données**: Vérifiez `./data/bot_config.db`

### Support
- Logs: `docker-compose logs`
- Status: `docker-compose ps`
- Shell: `docker-compose exec telegram-bot sh`

## 📄 Licence

MIT License - Libre d'utilisation et modification.