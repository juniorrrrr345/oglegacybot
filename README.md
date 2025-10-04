# Bot Telegram avec Cloudflare D1

Bot Telegram complet avec panel d'administration et stockage sur Cloudflare D1.

## 🚀 Fonctionnalités

### Pour les utilisateurs (/start)
- Message et photo d'accueil personnalisables
- Mini application web
- 3 services principaux : Livraison, Postal, Meet Up
- Sous-menus pour chaque service
- Réseaux sociaux configurables
- Catalogue

### Pour les administrateurs (/admin)
- ✏️ Modifier le message d'accueil
- 🖼️ Modifier la photo d'accueil
- 📱 Configurer la mini application
- 🔗 Gérer les réseaux sociaux (nom, emoji, URL, ordre)
- 📊 Statistiques du bot
- 👥 Gérer les administrateurs
- 📢 Envoyer un message à tous
- 🚚 Gérer les services et sous-menus

## 📋 Prérequis

- Node.js 18+
- Compte Cloudflare avec Workers et D1
- Bot Telegram (créé via @BotFather)
- Wrangler CLI installé

## 🛠️ Installation

### 1. Cloner le repository
```bash
git clone https://github.com/votre-repo/telegram-bot-cloudflare.git
cd telegram-bot-cloudflare
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer Cloudflare D1
```bash
# Créer la base de données
wrangler d1 create telegram-bot-db

# Exécuter les migrations
wrangler d1 execute telegram-bot-db --file=./schema.sql
```

### 4. Configuration
Créer un fichier `.env` :
```env
BOT_TOKEN=votre_token_telegram
ADMIN_ID=votre_id_telegram
CLOUDFLARE_ACCOUNT_ID=votre_account_id
CLOUDFLARE_DATABASE_ID=votre_database_id
```

### 5. Déploiement
```bash
# En développement
npm run dev

# En production (Cloudflare Workers)
npm run deploy
```

## 🗄️ Structure de la base de données

La base de données D1 contient :
- Configuration du bot
- Utilisateurs
- Réseaux sociaux
- Services et sous-menus
- Statistiques

## 📝 Utilisation

### Commandes disponibles
- `/start` - Menu principal
- `/admin` - Panel d'administration (réservé aux admins)

### Panel Admin
1. **Message d'accueil** : Modifier le texte avec {firstname} pour le prénom
2. **Photo d'accueil** : Envoyer une nouvelle photo
3. **Mini App** : Configurer l'URL et le texte du bouton
4. **Réseaux sociaux** : Ajouter, modifier, supprimer, réorganiser
5. **Services** : Gérer les textes, photos et sous-menus
6. **Broadcast** : Envoyer un message à tous les utilisateurs

## 🔧 Personnalisation

Pour ajouter un nouveau service :
1. Modifier `config.js` pour ajouter les champs
2. Ajouter les handlers dans `bot.js`
3. Mettre à jour le schema SQL

## 📦 Déploiement sur VPS

Si vous préférez un déploiement sur VPS :
```bash
# Utiliser PM2
npm install -g pm2
pm2 start bot.js --name "telegram-bot"
pm2 save
pm2 startup
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou un PR.

## 📄 Licence

MIT