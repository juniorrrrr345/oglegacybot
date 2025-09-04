# 🎯 Fonctionnalités Détaillées

## 🤖 Bot Telegram

### Commandes Principales

#### `/start`
- **Fonction** : Message d'accueil personnalisable
- **Affichage** : Message + photo (optionnel) + boutons réseaux sociaux
- **Personnalisation** : Entièrement configurable via le panel admin
- **Statistiques** : Enregistre chaque utilisation

#### `/config` (Administrateurs uniquement)
- **Fonction** : Panel de configuration avec boutons modulaires
- **Accès** : Réservé aux administrateurs configurés
- **Interface** : 8 boutons modulaires pour toutes les fonctionnalités

#### `/help`
- **Fonction** : Affichage de l'aide et des commandes disponibles
- **Contenu** : Dynamique selon les permissions de l'utilisateur

### Boutons Modulaires de `/config`

#### ✏️ Modifier le message d'accueil
- Permet de changer le texte affiché avec `/start`
- Support des emojis et retours à la ligne
- Aperçu en temps réel dans le panel admin

#### 🖼️ Modifier la photo d'accueil
- Upload d'image pour accompagner le message `/start`
- Formats supportés : JPG, PNG, GIF
- Taille max : 50MB
- Aperçu automatique

#### 📱 Modifier la mini application
- Configuration de l'URL d'une mini-app Telegram
- Intégration avec les Web Apps de Telegram
- Validation automatique des URLs

#### 🌐 Gérer les réseaux sociaux
- **Ajouter** : Nom, URL, icône emoji, ordre d'affichage
- **Modifier** : Tous les paramètres + statut actif/inactif
- **Supprimer** : Avec confirmation
- **Réorganiser** : Par numéro d'ordre
- **Aperçu** : Boutons comme dans le bot

#### ℹ️ Modifier les informations
- **Nom du bot** : Affiché dans les messages
- **Description** : Information générale
- **Contact support** : Username ou lien Telegram

#### 📢 Envoyer un message à tous
- **Diffusion** : Message à tous les utilisateurs actifs
- **Aperçu** : Prévisualisation avant envoi
- **Statistiques** : Compteur d'envois réussis/échoués
- **Historique** : Tous les messages de diffusion

#### 👥 Gérer les administrateurs
- **Ajouter** : Par ID Telegram + informations
- **Supprimer** : Avec confirmation
- **Super Admin** : Permissions étendues
- **Liste** : Tous les admins avec statut

#### 📊 Statistiques du bot
- **Utilisateurs** : Nombre total et actifs
- **Interactions** : Toutes les commandes utilisées
- **Commandes** : Détail par type (/start, /config, etc.)
- **Temps réel** : Mise à jour automatique

## 🌐 Panel Administrateur Web

### Interface Générale
- **Design** : Bootstrap 5 + thème personnalisé
- **Responsive** : Optimisé mobile/desktop
- **Navigation** : Sidebar avec icônes
- **Notifications** : Toasts et alertes

### Pages Principales

#### Dashboard (`/`)
- **Vue d'ensemble** : Statistiques principales
- **Actions rapides** : Boutons vers toutes les fonctions
- **Activité récente** : Dernières interactions
- **Configuration actuelle** : Résumé des paramètres

#### Configuration (`/config`)
- **Formulaire** : Tous les paramètres généraux
- **Upload photo** : Drag & drop avec aperçu
- **Aperçu temps réel** : Simulation du message /start
- **Validation** : Côté client et serveur

#### Réseaux Sociaux (`/social-networks`)
- **Liste** : Tableau avec tous les réseaux
- **Ajouter** : Modal avec formulaire complet
- **Modifier** : Edition inline ou modal
- **Supprimer** : Avec confirmation
- **Prévisualisation** : Comme dans le bot

#### Administrateurs (`/admins`)
- **Liste** : Tous les admins avec détails
- **Ajouter** : Par ID Telegram
- **Permissions** : Super admin / Admin normal
- **Statut** : Actif / Inactif

#### Diffusion (`/broadcast`)
- **Éditeur** : Zone de texte avec compteur
- **Aperçu** : Simulation du message
- **Statistiques** : Nombre d'utilisateurs cibles
- **Historique** : Toutes les diffusions passées
- **Confirmation** : Double validation avant envoi

#### Statistiques (`/stats`)
- **Graphiques** : Évolution des interactions
- **Détails** : Toutes les actions par utilisateur
- **Export** : Données en CSV (à implémenter)
- **Temps réel** : Actualisation automatique

### Fonctionnalités Techniques

#### Authentification
- **Session** : Gestion sécurisée des sessions
- **Mots de passe** : Hashage bcrypt
- **Timeout** : Déconnexion automatique
- **Protection** : CSRF et XSS

#### Upload de fichiers
- **Validation** : Type et taille
- **Stockage** : Dossier uploads avec permissions
- **Sécurité** : Noms de fichiers uniques
- **Optimisation** : Compression automatique

#### Base de données
- **SQLite** : Pour développement et petite échelle
- **Cloudflare D1** : Pour production
- **Migrations** : Setup automatique
- **Sauvegarde** : Scripts inclus

## 🔧 Architecture Technique

### Structure du Projet
```
├── src/
│   ├── main.js           # Point d'entrée principal
│   ├── bot.js            # Bot Telegram (Telegraf)
│   ├── admin-server.js   # Serveur web (Express)
│   ├── database.js       # Gestion BDD (SQLite/D1)
│   └── setup-database.js # Initialisation BDD
├── views/                # Templates EJS
├── public/               # Assets statiques
├── nginx/                # Configuration Nginx
└── docker/               # Configuration Docker
```

### Technologies Utilisées
- **Backend** : Node.js, Express.js
- **Bot** : Telegraf (Telegram Bot API)
- **Base de données** : SQLite + Cloudflare D1
- **Frontend** : EJS, Bootstrap 5, JavaScript vanilla
- **Déploiement** : Docker, Docker Compose, Nginx
- **Sécurité** : bcrypt, sessions, CSRF protection

### Intégrations
- **Cloudflare D1** : Base de données serverless
- **Telegram Bot API** : Via Telegraf
- **Nginx** : Reverse proxy et serveur statique
- **Docker** : Containerisation complète

## 📊 Base de Données

### Tables Principales

#### `bot_config`
- Configuration générale du bot
- Clé-valeur pour flexibilité
- Historique des modifications

#### `social_networks`
- Réseaux sociaux configurés
- Ordre d'affichage
- Statut actif/inactif

#### `administrators`
- Liste des administrateurs
- Permissions et statuts
- Informations Telegram

#### `bot_users`
- Tous les utilisateurs du bot
- Dernière interaction
- Données Telegram

#### `bot_stats`
- Toutes les interactions
- Horodatage précis
- Données contextuelles

#### `broadcast_messages`
- Historique des diffusions
- Statistiques d'envoi
- Métadonnées

## 🚀 Déploiement

### Environnements Supportés
- **Développement** : Local avec npm
- **Production** : VPS avec Docker
- **Cloud** : Compatible Cloudflare Workers

### Configuration Requise
- **CPU** : 1 vCPU minimum
- **RAM** : 512MB minimum (1GB recommandé)
- **Stockage** : 1GB minimum
- **Réseau** : Ports 80, 443, 3000

### Monitoring
- **Logs** : Docker Compose logs
- **Santé** : Endpoints de health check
- **Métriques** : Statistiques intégrées
- **Alertes** : Via logs et panel admin

---

**💡 Cette architecture permet une évolutivité facile et une maintenance simplifiée.**