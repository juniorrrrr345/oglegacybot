const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/bot_config.db');
        this.db = null;
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Erreur connexion base de données:', err);
            } else {
                console.log('✅ Connecté à la base de données SQLite');
            }
        });
    }

    // Configuration générale
    async getConfig(key) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT value FROM bot_config WHERE key = ?', [key], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.value : null);
            });
        });
    }

    async setConfig(key, value) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO bot_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [key, value],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async getAllConfig() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM bot_config ORDER BY key', (err, rows) => {
                if (err) reject(err);
                else {
                    const config = {};
                    rows.forEach(row => {
                        config[row.key] = row.value;
                    });
                    resolve(config);
                }
            });
        });
    }

    // Réseaux sociaux
    async getSocialNetworks() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM social_networks WHERE is_active = 1 ORDER BY order_position ASC',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async addSocialNetwork(name, url, icon, orderPosition = 0) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO social_networks (name, url, icon, order_position) VALUES (?, ?, ?, ?)',
                [name, url, icon, orderPosition],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateSocialNetwork(id, data) {
        const { name, url, icon, is_active, order_position } = data;
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE social_networks 
                 SET name = ?, url = ?, icon = ?, is_active = ?, order_position = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [name, url, icon, is_active, order_position, id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async deleteSocialNetwork(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM social_networks WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Utilisateurs
    async addUser(telegramId, userData) {
        const { username, first_name, last_name, language_code } = userData;
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO bot_users 
                 (telegram_id, username, first_name, last_name, language_code, last_interaction) 
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [telegramId, username, first_name, last_name, language_code || 'fr'],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getUser(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM bot_users WHERE telegram_id = ?', [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM bot_users WHERE is_active = 1', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getUsersCount() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM bot_users WHERE is_active = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }

    // Administrateurs
    async isAdmin(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM administrators WHERE telegram_id = ? AND is_active = 1',
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });
    }

    async addAdmin(telegramId, userData) {
        const { username, first_name, last_name, is_super_admin } = userData;
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO administrators 
                 (telegram_id, username, first_name, last_name, is_super_admin) 
                 VALUES (?, ?, ?, ?, ?)`,
                [telegramId, username, first_name, last_name, is_super_admin || 0],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getAllAdmins() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM administrators WHERE is_active = 1', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async removeAdmin(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE administrators SET is_active = 0 WHERE telegram_id = ?',
                [telegramId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Statistiques
    async addStat(userId, username, action, data = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO bot_stats (user_id, username, action, data) VALUES (?, ?, ?, ?)',
                [userId, username, action, data ? JSON.stringify(data) : null],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getStats(limit = 100) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM bot_stats ORDER BY created_at DESC LIMIT ?',
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getStatsCount(action = null) {
        const query = action 
            ? 'SELECT COUNT(*) as count FROM bot_stats WHERE action = ?'
            : 'SELECT COUNT(*) as count FROM bot_stats';
        const params = action ? [action] : [];

        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }

    // Messages de diffusion
    async createBroadcast(message, mediaType = null, mediaUrl = null, createdBy = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO broadcast_messages 
                 (message, media_type, media_url, created_by) 
                 VALUES (?, ?, ?, ?)`,
                [message, mediaType, mediaUrl, createdBy],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateBroadcastStatus(id, status, sentCount = 0, totalUsers = 0) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE broadcast_messages 
                 SET status = ?, sent_count = ?, total_users = ?, sent_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [status, sentCount, totalUsers, id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async getBroadcasts(limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM broadcast_messages ORDER BY created_at DESC LIMIT ?',
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // Fermer la connexion
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Erreur fermeture base:', err);
                } else {
                    console.log('✅ Base de données fermée');
                }
            });
        }
    }
}

module.exports = new Database();