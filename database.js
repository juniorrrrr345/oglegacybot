// Configuration automatique de la base de données
const { SQLiteDatabase } = require('./db-sqlite');
const { CloudflareD1Database } = require('./db-cloudflare-d1');

// Déterminer quelle base de données utiliser
function getDatabase() {
    // Si on est sur Cloudflare Workers (production)
    if (typeof global !== 'undefined' && global.CloudflareD1Database) {
        return new CloudflareD1Database();
    }
    
    // Si on a des variables Cloudflare D1 configurées
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_DATABASE_ID) {
        return new CloudflareD1Database();
    }
    
    // Par défaut, utiliser SQLite (pour VPS et développement local)
    return new SQLiteDatabase();
}

module.exports = { getDatabase };