const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuration pour la base D1 locale (développement)
const dbPath = path.join(__dirname, '../data/bot_config.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
    } else {
        console.log('Connecté à la base de données SQLite.');
    }
});

// Schéma de la base de données
const createTables = () => {
    // Table pour la configuration générale du bot
    db.run(`
        CREATE TABLE IF NOT EXISTS bot_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table pour les réseaux sociaux
    db.run(`
        CREATE TABLE IF NOT EXISTS social_networks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            icon TEXT,
            is_active BOOLEAN DEFAULT 1,
            order_position INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table pour les administrateurs
    db.run(`
        CREATE TABLE IF NOT EXISTS administrators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            is_super_admin BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table pour les statistiques
    db.run(`
        CREATE TABLE IF NOT EXISTS bot_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT,
            action TEXT NOT NULL,
            data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Table pour les messages de diffusion
    db.run(`
        CREATE TABLE IF NOT EXISTS broadcast_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            media_type TEXT,
            media_url TEXT,
            sent_count INTEGER DEFAULT 0,
            total_users INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME
        )
    `);

    // Table pour les utilisateurs du bot
    db.run(`
        CREATE TABLE IF NOT EXISTS bot_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            language_code TEXT DEFAULT 'fr',
            is_active BOOLEAN DEFAULT 1,
            last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

// Insertion des données par défaut
const insertDefaultData = () => {
    // Configuration par défaut
    const defaultConfigs = [
        ['welcome_message', '🎉 Bienvenue ! Je suis votre assistant virtuel.'],
        ['welcome_photo', ''],
        ['mini_app_url', ''],
        ['bot_name', 'Mon Bot Telegram'],
        ['bot_description', 'Description de mon bot'],
        ['support_contact', '@support']
    ];

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO bot_config (key, value) VALUES (?, ?)
    `);

    defaultConfigs.forEach(([key, value]) => {
        stmt.run(key, value);
    });
    stmt.finalize();

    // Réseaux sociaux par défaut
    const defaultSocials = [
        ['Telegram', 'https://t.me/votre_channel', '📱', 1, 1],
        ['Twitter', 'https://twitter.com/votre_compte', '🐦', 1, 2],
        ['Instagram', 'https://instagram.com/votre_compte', '📸', 1, 3],
        ['YouTube', 'https://youtube.com/votre_chaine', '🎥', 1, 4],
        ['Website', 'https://votre-site.com', '🌐', 1, 5]
    ];

    const socialStmt = db.prepare(`
        INSERT OR IGNORE INTO social_networks (name, url, icon, is_active, order_position) VALUES (?, ?, ?, ?, ?)
    `);

    defaultSocials.forEach(([name, url, icon, is_active, order_position]) => {
        socialStmt.run(name, url, icon, is_active, order_position);
    });
    socialStmt.finalize();

    console.log('✅ Données par défaut insérées avec succès');
};

// Exécution du setup
createTables();
setTimeout(() => {
    insertDefaultData();
    db.close((err) => {
        if (err) {
            console.error('Erreur lors de la fermeture de la base:', err);
        } else {
            console.log('✅ Base de données configurée avec succès!');
            console.log('📁 Fichier de base: ' + dbPath);
        }
    });
}, 1000);

module.exports = { dbPath };