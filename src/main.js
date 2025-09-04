#!/usr/bin/env node

/**
 * Point d'entrée principal pour démarrer le bot Telegram et le panel admin
 */

require('dotenv').config();
const TelegramBot = require('./bot');
const AdminServer = require('./admin-server');

class MainApplication {
    constructor() {
        this.bot = null;
        this.adminServer = null;
        this.isShuttingDown = false;
    }

    async start() {
        console.log('🚀 Démarrage de l\'application...');
        
        try {
            // Vérifier les variables d'environnement requises
            this.checkEnvironmentVariables();
            
            // Initialiser la base de données
            await this.initializeDatabase();
            
            // Démarrer le bot Telegram
            console.log('🤖 Démarrage du bot Telegram...');
            this.bot = new TelegramBot();
            this.bot.start();
            
            // Démarrer le serveur admin
            console.log('🌐 Démarrage du panel administrateur...');
            this.adminServer = new AdminServer();
            this.adminServer.start();
            
            // Configurer les gestionnaires de signaux pour un arrêt propre
            this.setupGracefulShutdown();
            
            console.log('✅ Application démarrée avec succès !');
            console.log(`📱 Bot Telegram: Actif`);
            console.log(`🌐 Panel Admin: http://localhost:${process.env.ADMIN_PORT || 3000}`);
            console.log(`👤 Login: ${process.env.ADMIN_USERNAME || 'admin'}`);
            
        } catch (error) {
            console.error('❌ Erreur lors du démarrage:', error);
            process.exit(1);
        }
    }

    checkEnvironmentVariables() {
        const requiredVars = [
            'TELEGRAM_BOT_TOKEN',
            'ADMIN_USERNAME',
            'ADMIN_PASSWORD'
        ];

        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('❌ Variables d\'environnement manquantes:');
            missingVars.forEach(varName => {
                console.error(`   - ${varName}`);
            });
            console.error('\n💡 Copiez .env.example vers .env et configurez vos valeurs');
            throw new Error('Configuration manquante');
        }

        // Avertissements pour les variables optionnelles mais recommandées
        const recommendedVars = [
            'SESSION_SECRET',
            'DOMAIN'
        ];

        const missingRecommended = recommendedVars.filter(varName => !process.env[varName]);
        if (missingRecommended.length > 0) {
            console.warn('⚠️  Variables recommandées manquantes:');
            missingRecommended.forEach(varName => {
                console.warn(`   - ${varName}`);
            });
        }
    }

    async initializeDatabase() {
        const db = require('./database');
        
        // Test de connexion à la base de données
        try {
            await db.getConfig('test');
            console.log('✅ Base de données connectée');
        } catch (error) {
            console.log('📦 Initialisation de la base de données...');
            
            // Exécuter le script de setup
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            try {
                await execAsync('node src/setup-database.js');
                console.log('✅ Base de données initialisée');
            } catch (setupError) {
                console.error('❌ Erreur initialisation base:', setupError);
                throw setupError;
            }
        }
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) {
                console.log('⚠️  Arrêt forcé...');
                process.exit(1);
            }
            
            this.isShuttingDown = true;
            console.log(`\n🛑 Signal ${signal} reçu, arrêt en cours...`);
            
            try {
                // Arrêter le bot Telegram
                if (this.bot && this.bot.bot) {
                    console.log('🤖 Arrêt du bot Telegram...');
                    this.bot.bot.stop(signal);
                }
                
                // Fermer la base de données
                const db = require('./database');
                if (db && db.close) {
                    console.log('💾 Fermeture de la base de données...');
                    db.close();
                }
                
                console.log('✅ Arrêt propre terminé');
                process.exit(0);
                
            } catch (error) {
                console.error('❌ Erreur lors de l\'arrêt:', error);
                process.exit(1);
            }
        };

        // Gestionnaires de signaux
        process.once('SIGINT', () => shutdown('SIGINT'));
        process.once('SIGTERM', () => shutdown('SIGTERM'));
        
        // Gestionnaire d'erreurs non gérées
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Promesse rejetée non gérée:', reason);
            console.error('   Promise:', promise);
        });
        
        process.on('uncaughtException', (error) => {
            console.error('❌ Exception non gérée:', error);
            shutdown('UNCAUGHT_EXCEPTION');
        });
    }
}

// Démarrer l'application si ce fichier est exécuté directement
if (require.main === module) {
    const app = new MainApplication();
    app.start().catch(error => {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    });
}

module.exports = MainApplication;