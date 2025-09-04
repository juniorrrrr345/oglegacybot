# 🚀 Guide de Démarrage Rapide

## 📋 Prérequis

- **VPS** avec Ubuntu/Debian
- **Nom de domaine** pointant vers votre VPS
- **Token de bot Telegram** (obtenu via [@BotFather](https://t.me/BotFather))
- **Docker** et **Docker Compose** installés

## ⚡ Installation Express (5 minutes)

### 1. Cloner et configurer

```bash
# Cloner le projet
git clone <votre-repo>
cd telegram-bot-admin-panel

# Copier et configurer l'environnement
cp .env.example .env
nano .env  # Configurez vos variables
```

### 2. Variables essentielles à configurer dans `.env`

```env
# OBLIGATOIRE - Token de votre bot Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxyz

# OBLIGATOIRE - Identifiants admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=VotreMotDePasseSecurise123

# OBLIGATOIRE - Secrets de sécurité
SESSION_SECRET=VotreCleSecrete456
JWT_SECRET=VotreCleJWT789

# RECOMMANDÉ - Votre domaine
DOMAIN=votre-domaine.com
TELEGRAM_WEBHOOK_URL=https://votre-domaine.com/webhook
```

### 3. Déploiement automatique

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Déployer (installe Docker si nécessaire)
./deploy.sh production
```

### 4. Vérification

```bash
# Vérifier les conteneurs
docker-compose ps

# Voir les logs
docker-compose logs -f
```

## 🎯 Accès aux Services

- **Panel Admin**: `http://votre-ip:3000` ou `http://votre-domaine.com`
- **Login**: `admin` / `votre-mot-de-passe`
- **Bot Telegram**: Cherchez votre bot par son nom sur Telegram

## 🔧 Configuration du Bot

### Dans le Panel Admin :

1. **Configuration Générale** (`/config`)
   - Message d'accueil
   - Photo d'accueil
   - Informations du bot

2. **Réseaux Sociaux** (`/social-networks`)
   - Ajouter vos liens sociaux
   - Configurer les icônes et l'ordre

3. **Administrateurs** (`/admins`)
   - Ajouter des admins par leur ID Telegram
   - Gérer les permissions

### Commandes du Bot :

- `/start` - Message d'accueil avec boutons sociaux
- `/config` - Panel de configuration (admins uniquement)
- `/help` - Aide

## 📱 Fonctionnalités du Bot

### Commande `/config` (Boutons modulaires) :

- ✏️ **Modifier le message d'accueil**
- 🖼️ **Modifier la photo d'accueil**  
- 📱 **Modifier la mini application**
- 🌐 **Gérer les réseaux sociaux**
- ℹ️ **Modifier les informations**
- 📢 **Envoyer un message à tous**
- 👥 **Gérer les administrateurs**
- 📊 **Statistiques du bot**

## 🛠️ Commandes Utiles

```bash
# Redémarrer les services
docker-compose restart

# Voir les logs en temps réel
docker-compose logs -f telegram-bot

# Arrêter les services
docker-compose down

# Mettre à jour et redémarrer
git pull && docker-compose up --build -d

# Sauvegarder la base de données
cp data/bot_config.db backups/bot_config_$(date +%Y%m%d).db
```

## 🔒 Sécurité

### Configuration HTTPS (Recommandé)

1. **Obtenir un certificat SSL** (Let's Encrypt) :
```bash
# Installer certbot
sudo apt install certbot

# Obtenir le certificat
sudo certbot certonly --standalone -d votre-domaine.com
```

2. **Copier les certificats** :
```bash
sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem ssl/
sudo chown $USER:$USER ssl/*
```

3. **Activer HTTPS** dans `nginx/conf.d/bot-admin.conf` :
```nginx
# Décommenter les lignes SSL
listen 443 ssl http2;
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

4. **Redémarrer Nginx** :
```bash
docker-compose restart nginx
```

### Firewall

```bash
# Ouvrir les ports nécessaires
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 🐛 Dépannage

### Bot ne répond pas
```bash
# Vérifier les logs
docker-compose logs telegram-bot

# Vérifier le token
echo $TELEGRAM_BOT_TOKEN

# Redémarrer le bot
docker-compose restart telegram-bot
```

### Panel admin inaccessible
```bash
# Vérifier le port
netstat -tlnp | grep 3000

# Vérifier les logs
docker-compose logs nginx

# Tester localement
curl http://localhost:3000
```

### Base de données corrompue
```bash
# Sauvegarder l'ancienne
mv data/bot_config.db data/bot_config.db.backup

# Recréer la base
docker-compose exec telegram-bot npm run setup-db
```

## 📞 Support

- Logs: `docker-compose logs`
- Status: `docker-compose ps` 
- Shell: `docker-compose exec telegram-bot sh`

## 🔄 Mise à Jour

```bash
# Sauvegarder
cp -r data/ backup-$(date +%Y%m%d)/

# Mettre à jour
git pull
docker-compose up --build -d

# Vérifier
docker-compose logs --tail=50
```

---

**🎉 Votre bot Telegram avec panel admin est maintenant prêt !**