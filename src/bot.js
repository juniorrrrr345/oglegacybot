const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('./database');

class TelegramBot {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.setupMiddleware();
        this.setupCommands();
        this.setupCallbacks();
    }

    setupMiddleware() {
        // Middleware pour enregistrer les utilisateurs et stats
        this.bot.use(async (ctx, next) => {
            if (ctx.from) {
                // Enregistrer/mettre à jour l'utilisateur
                await db.addUser(ctx.from.id.toString(), {
                    username: ctx.from.username,
                    first_name: ctx.from.first_name,
                    last_name: ctx.from.last_name,
                    language_code: ctx.from.language_code
                });

                // Enregistrer la statistique
                const action = ctx.message ? 
                    (ctx.message.text ? ctx.message.text.split(' ')[0] : 'message') : 
                    (ctx.callbackQuery ? 'callback_query' : 'unknown');
                
                await db.addStat(
                    ctx.from.id.toString(),
                    ctx.from.username,
                    action,
                    { chat_id: ctx.chat?.id }
                );
            }
            return next();
        });
    }

    setupCommands() {
        // Commande /start
        this.bot.command('start', async (ctx) => {
            try {
                const welcomeMessage = await db.getConfig('welcome_message') || 
                    '🎉 Bienvenue ! Je suis votre assistant virtuel.';
                
                const welcomePhoto = await db.getConfig('welcome_photo');
                
                const socialNetworks = await db.getSocialNetworks();
                const keyboard = this.createSocialKeyboard(socialNetworks);

                if (welcomePhoto && fs.existsSync(welcomePhoto)) {
                    await ctx.replyWithPhoto(
                        { source: welcomePhoto },
                        { 
                            caption: welcomeMessage,
                            reply_markup: keyboard
                        }
                    );
                } else {
                    await ctx.reply(welcomeMessage, { reply_markup: keyboard });
                }
            } catch (error) {
                console.error('❌ Erreur commande /start:', error);
                await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer.');
            }
        });

        // Commande /config (pour les administrateurs)
        this.bot.command('config', async (ctx) => {
            try {
                const isAdmin = await db.isAdmin(ctx.from.id.toString());
                
                if (!isAdmin) {
                    return await ctx.reply('❌ Vous n\'avez pas les permissions pour utiliser cette commande.');
                }

                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('✏️ Modifier le message d\'accueil', 'config_welcome_message')],
                    [Markup.button.callback('🖼️ Modifier la photo d\'accueil', 'config_welcome_photo')],
                    [Markup.button.callback('📱 Modifier la mini application', 'config_mini_app')],
                    [Markup.button.callback('🌐 Gérer les réseaux sociaux', 'config_social_networks')],
                    [Markup.button.callback('ℹ️ Modifier les informations', 'config_bot_info')],
                    [Markup.button.callback('📢 Envoyer un message à tous', 'config_broadcast')],
                    [Markup.button.callback('👥 Gérer les administrateurs', 'config_admins')],
                    [Markup.button.callback('📊 Statistiques du bot', 'config_stats')]
                ]);

                await ctx.reply(
                    '⚙️ **Panel de Configuration**\\n\\nChoisissez une option à configurer :',
                    { 
                        parse_mode: 'MarkdownV2',
                        reply_markup: keyboard 
                    }
                );
            } catch (error) {
                console.error('❌ Erreur commande /config:', error);
                await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer.');
            }
        });

        // Commande d'aide
        this.bot.command('help', async (ctx) => {
            const helpText = `
🤖 **Commandes disponibles :**

/start - Démarrer le bot et voir le message d'accueil
/config - Panel de configuration (administrateurs uniquement)
/help - Afficher cette aide

📞 **Support :** ${await db.getConfig('support_contact') || '@support'}
            `;

            await ctx.reply(helpText, { parse_mode: 'Markdown' });
        });
    }

    setupCallbacks() {
        // Callback pour le message d'accueil
        this.bot.action('config_welcome_message', async (ctx) => {
            await ctx.answerCbQuery();
            await ctx.reply(
                '✏️ Envoyez le nouveau message d\'accueil :\\n\\n_Tapez votre message et envoyez\\-le\\._',
                { parse_mode: 'MarkdownV2' }
            );
            
            // Attendre la réponse
            this.bot.on('text', async (textCtx) => {
                if (textCtx.from.id === ctx.from.id) {
                    await db.setConfig('welcome_message', textCtx.message.text);
                    await textCtx.reply('✅ Message d\'accueil mis à jour !');
                }
            });
        });

        // Callback pour la photo d'accueil
        this.bot.action('config_welcome_photo', async (ctx) => {
            await ctx.answerCbQuery();
            await ctx.reply(
                '🖼️ Envoyez la nouvelle photo d\'accueil :\\n\\n_Envoyez une image\\._',
                { parse_mode: 'MarkdownV2' }
            );
        });

        // Callback pour la mini application
        this.bot.action('config_mini_app', async (ctx) => {
            await ctx.answerCbQuery();
            await ctx.reply(
                '📱 Envoyez l\'URL de votre mini application :\\n\\n_Exemple: https://votre\\-app\\.com_',
                { parse_mode: 'MarkdownV2' }
            );
        });

        // Callback pour les réseaux sociaux
        this.bot.action('config_social_networks', async (ctx) => {
            await ctx.answerCbQuery();
            
            const socialNetworks = await db.getSocialNetworks();
            let message = '🌐 **Réseaux sociaux actuels :**\\n\\n';
            
            if (socialNetworks.length === 0) {
                message += '_Aucun réseau social configuré\\._\\n\\n';
            } else {
                socialNetworks.forEach((social, index) => {
                    message += `${index + 1}\\. ${social.icon} **${social.name}**\\n   ${social.url}\\n\\n`;
                });
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('➕ Ajouter un réseau', 'social_add')],
                [Markup.button.callback('✏️ Modifier un réseau', 'social_edit')],
                [Markup.button.callback('🗑️ Supprimer un réseau', 'social_delete')],
                [Markup.button.callback('🔙 Retour', 'config_back')]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'MarkdownV2',
                reply_markup: keyboard
            });
        });

        // Callback pour les informations du bot
        this.bot.action('config_bot_info', async (ctx) => {
            await ctx.answerCbQuery();
            
            const botName = await db.getConfig('bot_name') || 'Mon Bot';
            const botDescription = await db.getConfig('bot_description') || 'Description du bot';
            const supportContact = await db.getConfig('support_contact') || '@support';

            const message = `ℹ️ **Informations actuelles du bot :**\\n\\n` +
                `**Nom :** ${botName}\\n` +
                `**Description :** ${botDescription}\\n` +
                `**Support :** ${supportContact}\\n\\n` +
                `Que souhaitez\\-vous modifier ?`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('📝 Nom du bot', 'info_name')],
                [Markup.button.callback('📄 Description', 'info_description')],
                [Markup.button.callback('📞 Contact support', 'info_support')],
                [Markup.button.callback('🔙 Retour', 'config_back')]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'MarkdownV2',
                reply_markup: keyboard
            });
        });

        // Callback pour la diffusion
        this.bot.action('config_broadcast', async (ctx) => {
            await ctx.answerCbQuery();
            
            const usersCount = await db.getUsersCount();
            
            await ctx.editMessageText(
                `📢 **Message de diffusion**\\n\\n` +
                `Utilisateurs actifs : **${usersCount}**\\n\\n` +
                `Envoyez le message que vous souhaitez diffuser à tous les utilisateurs\\n\\n` +
                `_⚠️ Cette action ne peut pas être annulée\\!_`,
                { parse_mode: 'MarkdownV2' }
            );
        });

        // Callback pour les administrateurs
        this.bot.action('config_admins', async (ctx) => {
            await ctx.answerCbQuery();
            
            const admins = await db.getAllAdmins();
            let message = '👥 **Administrateurs actuels :**\\n\\n';
            
            if (admins.length === 0) {
                message += '_Aucun administrateur configuré\\._\\n\\n';
            } else {
                admins.forEach((admin, index) => {
                    const superAdmin = admin.is_super_admin ? ' 👑' : '';
                    message += `${index + 1}\\. **${admin.first_name || 'Inconnu'}**${superAdmin}\\n` +
                              `   @${admin.username || 'pas_de_username'}\\n` +
                              `   ID: \`${admin.telegram_id}\`\\n\\n`;
                });
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('➕ Ajouter un admin', 'admin_add')],
                [Markup.button.callback('🗑️ Supprimer un admin', 'admin_remove')],
                [Markup.button.callback('🔙 Retour', 'config_back')]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'MarkdownV2',
                reply_markup: keyboard
            });
        });

        // Callback pour les statistiques
        this.bot.action('config_stats', async (ctx) => {
            await ctx.answerCbQuery();
            
            const usersCount = await db.getUsersCount();
            const totalStats = await db.getStatsCount();
            const startCount = await db.getStatsCount('/start');
            const configCount = await db.getStatsCount('/config');
            
            const message = `📊 **Statistiques du bot**\\n\\n` +
                `👥 **Utilisateurs actifs :** ${usersCount}\\n` +
                `📈 **Interactions totales :** ${totalStats}\\n` +
                `🎉 **Commandes /start :** ${startCount}\\n` +
                `⚙️ **Commandes /config :** ${configCount}\\n\\n` +
                `_Statistiques mises à jour en temps réel_`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Actualiser', 'config_stats')],
                [Markup.button.callback('📋 Détails', 'stats_details')],
                [Markup.button.callback('🔙 Retour', 'config_back')]
            ]);

            await ctx.editMessageText(message, {
                parse_mode: 'MarkdownV2',
                reply_markup: keyboard
            });
        });

        // Retour au menu principal
        this.bot.action('config_back', async (ctx) => {
            await ctx.answerCbQuery();
            
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Modifier le message d\'accueil', 'config_welcome_message')],
                [Markup.button.callback('🖼️ Modifier la photo d\'accueil', 'config_welcome_photo')],
                [Markup.button.callback('📱 Modifier la mini application', 'config_mini_app')],
                [Markup.button.callback('🌐 Gérer les réseaux sociaux', 'config_social_networks')],
                [Markup.button.callback('ℹ️ Modifier les informations', 'config_bot_info')],
                [Markup.button.callback('📢 Envoyer un message à tous', 'config_broadcast')],
                [Markup.button.callback('👥 Gérer les administrateurs', 'config_admins')],
                [Markup.button.callback('📊 Statistiques du bot', 'config_stats')]
            ]);

            await ctx.editMessageText(
                '⚙️ **Panel de Configuration**\\n\\nChoisissez une option à configurer :',
                { 
                    parse_mode: 'MarkdownV2',
                    reply_markup: keyboard 
                }
            );
        });
    }

    createSocialKeyboard(socialNetworks) {
        if (socialNetworks.length === 0) {
            return null;
        }

        const buttons = socialNetworks.map(social => 
            Markup.button.url(`${social.icon} ${social.name}`, social.url)
        );

        // Organiser en lignes de 2 boutons maximum
        const rows = [];
        for (let i = 0; i < buttons.length; i += 2) {
            rows.push(buttons.slice(i, i + 2));
        }

        return Markup.inlineKeyboard(rows);
    }

    // Méthode pour envoyer un message à tous les utilisateurs
    async broadcastMessage(message, mediaType = null, mediaUrl = null, createdBy = null) {
        const users = await db.getAllUsers();
        const broadcastId = await db.createBroadcast(message, mediaType, mediaUrl, createdBy);
        
        let sentCount = 0;
        const totalUsers = users.length;

        for (const user of users) {
            try {
                if (mediaType && mediaUrl) {
                    if (mediaType === 'photo') {
                        await this.bot.telegram.sendPhoto(user.telegram_id, mediaUrl, { caption: message });
                    } else if (mediaType === 'video') {
                        await this.bot.telegram.sendVideo(user.telegram_id, mediaUrl, { caption: message });
                    }
                } else {
                    await this.bot.telegram.sendMessage(user.telegram_id, message);
                }
                sentCount++;
            } catch (error) {
                console.error(`❌ Erreur envoi à ${user.telegram_id}:`, error);
            }
            
            // Petite pause pour éviter les limites de taux
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        await db.updateBroadcastStatus(broadcastId, 'completed', sentCount, totalUsers);
        return { sentCount, totalUsers };
    }

    start() {
        this.bot.launch();
        console.log('🤖 Bot Telegram démarré !');
        
        // Graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

// Démarrer le bot si ce fichier est exécuté directement
if (require.main === module) {
    const bot = new TelegramBot();
    bot.start();
}

module.exports = TelegramBot;