const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
require('dotenv').config();

const db = require('./database');
const TelegramBot = require('./bot');

class AdminServer {
    constructor() {
        this.app = express();
        this.port = process.env.ADMIN_PORT || 3000;
        this.bot = new TelegramBot();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Configuration EJS
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, '../views'));

        // Middleware
        this.app.use(express.static(path.join(__dirname, '../public')));
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.json());

        // Session
        this.app.use(session({
            secret: process.env.SESSION_SECRET || 'your-secret-key',
            resave: false,
            saveUninitialized: false,
            cookie: { 
                secure: false, // true en production avec HTTPS
                maxAge: 24 * 60 * 60 * 1000 // 24 heures
            }
        }));

        // Configuration multer pour les uploads
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadDir = path.join(__dirname, '../uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
            }
        });

        this.upload = multer({ 
            storage: storage,
            limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
            fileFilter: (req, file, cb) => {
                const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
                const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
                const mimetype = allowedTypes.test(file.mimetype);
                
                if (mimetype && extname) {
                    return cb(null, true);
                } else {
                    cb(new Error('Type de fichier non autorisé'));
                }
            }
        });

        // Middleware d'authentification
        this.requireAuth = (req, res, next) => {
            if (req.session.isAuthenticated) {
                next();
            } else {
                res.redirect('/login');
            }
        };
    }

    setupRoutes() {
        // Page de connexion
        this.app.get('/login', (req, res) => {
            if (req.session.isAuthenticated) {
                return res.redirect('/');
            }
            res.render('login', { error: req.query.error });
        });

        this.app.post('/login', async (req, res) => {
            const { username, password } = req.body;
            const adminUsername = process.env.ADMIN_USERNAME || 'admin';
            const adminPassword = process.env.ADMIN_PASSWORD;

            if (username === adminUsername && password === adminPassword) {
                req.session.isAuthenticated = true;
                req.session.username = username;
                res.redirect('/');
            } else {
                res.redirect('/login?error=1');
            }
        });

        // Déconnexion
        this.app.get('/logout', (req, res) => {
            req.session.destroy();
            res.redirect('/login');
        });

        // Dashboard principal
        this.app.get('/', this.requireAuth, async (req, res) => {
            try {
                const stats = {
                    usersCount: await db.getUsersCount(),
                    totalInteractions: await db.getStatsCount(),
                    startCommands: await db.getStatsCount('/start'),
                    configCommands: await db.getStatsCount('/config'),
                    adminsCount: (await db.getAllAdmins()).length,
                    socialNetworks: (await db.getSocialNetworks()).length
                };

                const recentStats = await db.getStats(10);
                const config = await db.getAllConfig();

                res.render('dashboard', { 
                    stats, 
                    recentStats, 
                    config,
                    moment,
                    username: req.session.username
                });
            } catch (error) {
                console.error('❌ Erreur dashboard:', error);
                res.render('error', { error: 'Erreur lors du chargement du dashboard' });
            }
        });

        // Configuration générale
        this.app.get('/config', this.requireAuth, async (req, res) => {
            try {
                const config = await db.getAllConfig();
                res.render('config', { config, success: req.query.success });
            } catch (error) {
                console.error('❌ Erreur config:', error);
                res.render('error', { error: 'Erreur lors du chargement de la configuration' });
            }
        });

        this.app.post('/config', this.requireAuth, async (req, res) => {
            try {
                const { welcome_message, bot_name, bot_description, support_contact, mini_app_url } = req.body;
                
                await db.setConfig('welcome_message', welcome_message);
                await db.setConfig('bot_name', bot_name);
                await db.setConfig('bot_description', bot_description);
                await db.setConfig('support_contact', support_contact);
                await db.setConfig('mini_app_url', mini_app_url);

                res.redirect('/config?success=1');
            } catch (error) {
                console.error('❌ Erreur sauvegarde config:', error);
                res.render('error', { error: 'Erreur lors de la sauvegarde' });
            }
        });

        // Upload de photo d'accueil
        this.app.post('/upload-welcome-photo', this.requireAuth, this.upload.single('welcome_photo'), async (req, res) => {
            try {
                if (req.file) {
                    const photoPath = path.join(__dirname, '../uploads', req.file.filename);
                    await db.setConfig('welcome_photo', photoPath);
                    res.json({ success: true, filename: req.file.filename });
                } else {
                    res.json({ success: false, error: 'Aucun fichier uploadé' });
                }
            } catch (error) {
                console.error('❌ Erreur upload photo:', error);
                res.json({ success: false, error: error.message });
            }
        });

        // Gestion des réseaux sociaux
        this.app.get('/social-networks', this.requireAuth, async (req, res) => {
            try {
                const socialNetworks = await db.getSocialNetworks();
                res.render('social-networks', { socialNetworks, success: req.query.success });
            } catch (error) {
                console.error('❌ Erreur réseaux sociaux:', error);
                res.render('error', { error: 'Erreur lors du chargement des réseaux sociaux' });
            }
        });

        this.app.post('/social-networks', this.requireAuth, async (req, res) => {
            try {
                const { name, url, icon, order_position } = req.body;
                await db.addSocialNetwork(name, url, icon, parseInt(order_position) || 0);
                res.redirect('/social-networks?success=1');
            } catch (error) {
                console.error('❌ Erreur ajout réseau social:', error);
                res.render('error', { error: 'Erreur lors de l\'ajout du réseau social' });
            }
        });

        this.app.post('/social-networks/:id/edit', this.requireAuth, async (req, res) => {
            try {
                const { id } = req.params;
                const { name, url, icon, is_active, order_position } = req.body;
                
                await db.updateSocialNetwork(id, {
                    name,
                    url,
                    icon,
                    is_active: is_active ? 1 : 0,
                    order_position: parseInt(order_position) || 0
                });

                res.redirect('/social-networks?success=1');
            } catch (error) {
                console.error('❌ Erreur modification réseau social:', error);
                res.render('error', { error: 'Erreur lors de la modification' });
            }
        });

        this.app.post('/social-networks/:id/delete', this.requireAuth, async (req, res) => {
            try {
                const { id } = req.params;
                await db.deleteSocialNetwork(id);
                res.redirect('/social-networks?success=1');
            } catch (error) {
                console.error('❌ Erreur suppression réseau social:', error);
                res.render('error', { error: 'Erreur lors de la suppression' });
            }
        });

        // Gestion des administrateurs
        this.app.get('/admins', this.requireAuth, async (req, res) => {
            try {
                const admins = await db.getAllAdmins();
                res.render('admins', { admins, success: req.query.success });
            } catch (error) {
                console.error('❌ Erreur administrateurs:', error);
                res.render('error', { error: 'Erreur lors du chargement des administrateurs' });
            }
        });

        this.app.post('/admins', this.requireAuth, async (req, res) => {
            try {
                const { telegram_id, username, first_name, last_name, is_super_admin } = req.body;
                
                await db.addAdmin(telegram_id, {
                    username,
                    first_name,
                    last_name,
                    is_super_admin: is_super_admin ? 1 : 0
                });

                res.redirect('/admins?success=1');
            } catch (error) {
                console.error('❌ Erreur ajout admin:', error);
                res.render('error', { error: 'Erreur lors de l\'ajout de l\'administrateur' });
            }
        });

        this.app.post('/admins/:telegram_id/remove', this.requireAuth, async (req, res) => {
            try {
                const { telegram_id } = req.params;
                await db.removeAdmin(telegram_id);
                res.redirect('/admins?success=1');
            } catch (error) {
                console.error('❌ Erreur suppression admin:', error);
                res.render('error', { error: 'Erreur lors de la suppression' });
            }
        });

        // Diffusion de messages
        this.app.get('/broadcast', this.requireAuth, async (req, res) => {
            try {
                const usersCount = await db.getUsersCount();
                const broadcasts = await db.getBroadcasts(20);
                res.render('broadcast', { usersCount, broadcasts, success: req.query.success });
            } catch (error) {
                console.error('❌ Erreur diffusion:', error);
                res.render('error', { error: 'Erreur lors du chargement de la diffusion' });
            }
        });

        this.app.post('/broadcast', this.requireAuth, async (req, res) => {
            try {
                const { message } = req.body;
                
                if (!message || message.trim() === '') {
                    return res.render('broadcast', { 
                        error: 'Le message ne peut pas être vide',
                        usersCount: await db.getUsersCount(),
                        broadcasts: await db.getBroadcasts(20)
                    });
                }

                // Envoyer le message en arrière-plan
                this.bot.broadcastMessage(message, null, null, req.session.username)
                    .then(result => {
                        console.log(`✅ Message diffusé: ${result.sentCount}/${result.totalUsers}`);
                    })
                    .catch(error => {
                        console.error('❌ Erreur diffusion:', error);
                    });

                res.redirect('/broadcast?success=1');
            } catch (error) {
                console.error('❌ Erreur diffusion:', error);
                res.render('error', { error: 'Erreur lors de la diffusion' });
            }
        });

        // Statistiques détaillées
        this.app.get('/stats', this.requireAuth, async (req, res) => {
            try {
                const stats = await db.getStats(100);
                const users = await db.getAllUsers();
                
                res.render('stats', { stats, users, moment });
            } catch (error) {
                console.error('❌ Erreur stats:', error);
                res.render('error', { error: 'Erreur lors du chargement des statistiques' });
            }
        });

        // API endpoints
        this.app.get('/api/stats', this.requireAuth, async (req, res) => {
            try {
                const stats = {
                    users: await db.getUsersCount(),
                    interactions: await db.getStatsCount(),
                    starts: await db.getStatsCount('/start'),
                    configs: await db.getStatsCount('/config')
                };
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Servir les fichiers uploadés
        this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🌐 Panel administrateur démarré sur http://localhost:${this.port}`);
        });
    }
}

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
    const adminServer = new AdminServer();
    adminServer.start();
}

module.exports = AdminServer;