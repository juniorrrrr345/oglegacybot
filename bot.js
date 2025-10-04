require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { SQLiteDatabase } = require('./db-sqlite');

// Vérifier les variables d'environnement
if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN n\'est pas défini dans le fichier .env');
    process.exit(1);
}

if (!process.env.ADMIN_ID) {
    console.error('❌ ADMIN_ID n\'est pas défini dans le fichier .env');
    process.exit(1);
}

// Initialiser le bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const db = new SQLiteDatabase();

// Attendre que la base de données soit prête
db.db.on('open', () => {
    console.log('✅ Base de données SQLite prête');
});

// États des utilisateurs pour gérer les conversations
const userStates = new Map();

// Fonction pour convertir les entités Telegram en HTML
function parseMessageEntities(text, entities) {
    if (!entities || entities.length === 0) return text;
    
    // Trier les entités par offset décroissant pour traiter de la fin vers le début
    const sortedEntities = [...entities].sort((a, b) => b.offset - a.offset);
    
    let result = text;
    
    for (const entity of sortedEntities) {
        const start = entity.offset;
        const end = entity.offset + entity.length;
        const entityText = text.substring(start, end);
        
        let replacement = entityText;
        
        switch (entity.type) {
            case 'bold':
                replacement = `<b>${entityText}</b>`;
                break;
            case 'italic':
                replacement = `<i>${entityText}</i>`;
                break;
            case 'underline':
                replacement = `<u>${entityText}</u>`;
                break;
            case 'strikethrough':
                replacement = `<s>${entityText}</s>`;
                break;
            case 'code':
                replacement = `<code>${entityText}</code>`;
                break;
            case 'pre':
                replacement = `<pre>${entityText}</pre>`;
                break;
            case 'text_link':
                replacement = `<a href="${entity.url}">${entityText}</a>`;
                break;
            case 'spoiler':
                replacement = `<span class="tg-spoiler">${entityText}</span>`;
                break;
        }
        
        // Remplacer dans le texte
        result = result.substring(0, start) + replacement + result.substring(end);
    }
    
    return result;
}

// Vérifier si l'utilisateur est admin
async function isAdmin(userId) {
    if (userId.toString() === process.env.ADMIN_ID) return true;
    
    const user = await db.getUser(userId);
    return user?.is_admin === 1;
}

// Fonction pour envoyer ou éditer un message (gère automatiquement les transitions photo/texte)
async function sendOrEditMessage(chatId, text, keyboard = null, parseMode = 'HTML', messageId = null) {
    const options = {
        parse_mode: parseMode,
        reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
    };

    if (messageId) {
        try {
            // Essayer d'éditer le message existant
            const result = await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                ...options
            });
            // S'assurer qu'on retourne toujours un objet avec message_id
            return result.message_id ? result : { message_id: messageId };
        } catch (error) {
            // Si l'édition échoue (probablement passage photo->texte), supprimer et recréer
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (deleteError) {
                // Ignorer si la suppression échoue
            }
        }
    }

    // Envoyer un nouveau message
    return await bot.sendMessage(chatId, text, options);
}

// Fonction pour envoyer une photo (gère automatiquement les transitions texte/photo)
async function sendOrEditPhoto(chatId, photo, caption, keyboard = null, messageId = null) {
    const options = {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
    };

    if (messageId) {
        try {
            // Essayer d'éditer avec une nouvelle photo
            const result = await bot.editMessageMedia({
                type: 'photo',
                media: photo,
                caption: caption,
                parse_mode: 'HTML'
            }, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
            });
            // S'assurer qu'on retourne toujours un objet avec message_id
            return result && result.message_id ? result : { message_id: messageId };
        } catch (error) {
            // Si l'édition échoue (probablement passage texte->photo), supprimer et recréer
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (deleteError) {
                // Ignorer si la suppression échoue
            }
        }
    }

    return await bot.sendPhoto(chatId, photo, options);
}

// Commande /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'utilisateur';

    // Récupérer l'état actuel
    const state = userStates.get(userId) || {};

    // Enregistrer/mettre à jour l'utilisateur
    await db.upsertUser(userId, msg.from.username, msg.from.first_name, msg.from.last_name);
    
    // Enregistrer la statistique
    await db.logEvent('start', userId);

    // Récupérer la configuration
    const config = await db.getConfig();
    
    // Préparer le message d'accueil
    const welcomeText = config.welcome_message.replace('{firstname}', firstName);
    
    // Créer le clavier principal
    const keyboard = [];
    
    // Mini App toujours en première ligne
    if (config.mini_app_url) {
        keyboard.push([{ 
            text: config.mini_app_text || '🎮 Ouvrir l\'application', 
            web_app: { url: config.mini_app_url } 
        }]);
    }
    
    // Services supprimés
    
    // Réseaux sociaux (un par ligne)
    const socialNetworks = await db.getSocialNetworks();
    if (socialNetworks.length > 0) {
        for (const social of socialNetworks) {
            keyboard.push([{
                text: `${social.emoji} ${social.name}`,
                url: social.url
            }]);
        }
    }
    
    let result;
    
    // Si on a déjà un messageId, essayer d'éditer
    if (state.messageId) {
        try {
            if (config.welcome_image) {
                result = await sendOrEditPhoto(chatId, config.welcome_image, welcomeText, keyboard, state.messageId);
            } else {
                result = await sendOrEditMessage(chatId, welcomeText, keyboard, 'HTML', state.messageId);
            }
        } catch (error) {
            // Si l'édition échoue, envoyer un nouveau message
            if (config.welcome_image) {
                result = await bot.sendPhoto(chatId, config.welcome_image, {
                    caption: welcomeText,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } else {
                result = await bot.sendMessage(chatId, welcomeText, {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: keyboard }
                });
            }
        }
    } else {
        // Sinon envoyer un nouveau message
        if (config.welcome_image) {
            result = await bot.sendPhoto(chatId, config.welcome_image, {
                caption: welcomeText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            result = await bot.sendMessage(chatId, welcomeText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    }
    
    // Sauvegarder le messageId
    userStates.set(userId, { ...state, messageId: result.message_id });
});

// Commande /admin
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Récupérer l'état actuel
    const state = userStates.get(userId) || {};

    if (!await isAdmin(userId)) {
        await bot.sendMessage(chatId, '❌ Accès refusé. Cette commande est réservée aux administrateurs.');
        return;
    }
    
    await db.logEvent('admin', userId);
    await showAdminMenu(chatId, userId, state.messageId);
});

// Afficher le menu admin
async function showAdminMenu(chatId, userId, messageId = null) {
    const config = await db.getConfig();
    const stats = await db.getStats();
    
    const keyboard = [
        [{ text: '✏️ Message d\'accueil', callback_data: 'admin_welcome' }],
        [{ text: '🖼️ Photo d\'accueil', callback_data: 'admin_photo' }],
        [{ text: '📱 Mini Application', callback_data: 'admin_miniapp' }],
        [{ text: '🔗 Gérer Réseaux Sociaux', callback_data: 'admin_social' }],
        [{ text: '🚚 Gérer Services', callback_data: 'admin_services' }],
        [{ text: '📊 Statistiques', callback_data: 'admin_stats' }],
        [{ text: '👥 Gérer Admins', callback_data: 'admin_manage' }],
        [{ text: '📢 Broadcast', callback_data: 'admin_broadcast' }]
    ];
    
    const text = `🔧 <b>Panel d'Administration</b>\n\n` +
                 `👥 Utilisateurs: ${stats.totalUsers}\n` +
                 `📊 Démarrages: ${stats.totalStarts}\n` +
                 `👨‍💼 Admins: ${stats.totalAdmins}`;
    
    const state = userStates.get(userId) || {};
    const result = await sendOrEditMessage(chatId, text, keyboard, 'HTML', messageId || state.messageId);
    userStates.set(userId, { ...state, messageId: result.message_id });
}

// Gestion des callbacks
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;
    const data = query.data;
    
    // Mettre à jour l'état avec le messageId
    const state = userStates.get(userId) || {};
    userStates.set(userId, { ...state, messageId: messageId });
    
    // Répondre au callback
    await bot.answerCallbackQuery(query.id);
    
    switch(data) {
        // Menu principal
        case 'back_to_start':
            // Récupérer la configuration
            const config = await db.getConfig();
            const firstName = query.from.first_name || 'utilisateur';
            const welcomeText = config.welcome_message.replace('{firstname}', firstName);
            
            // Créer le clavier principal
            const keyboard = [];
            
            // Mini App toujours en première ligne
            if (config.mini_app_url) {
                keyboard.push([{ 
                    text: config.mini_app_text || '🎮 Ouvrir l\'application', 
                    web_app: { url: config.mini_app_url } 
                }]);
            }
            
            // Services sur des lignes séparées
            keyboard.push([{ text: '🚚 Livraison', callback_data: 'service_liv' }]);
            keyboard.push([{ text: '📮 Postal', callback_data: 'service_pos' }]);
            keyboard.push([{ text: '📍 Meet Up', callback_data: 'service_meet' }]);
            
            // Réseaux sociaux (un par ligne)
            const socialNetworks = await db.getSocialNetworks();
            if (socialNetworks.length > 0) {
                for (const social of socialNetworks) {
                    keyboard.push([{
                        text: `${social.emoji} ${social.name}`,
                        url: social.url
                    }]);
                }
            }
            
            
            // Envoyer le message
            let result;
            if (config.welcome_image) {
                result = await sendOrEditPhoto(chatId, config.welcome_image, welcomeText, keyboard, messageId);
            } else {
                result = await sendOrEditMessage(chatId, welcomeText, keyboard, 'HTML', messageId);
            }
            
            // Mettre à jour le messageId dans l'état
            userStates.set(userId, { ...state, messageId: result.message_id });
            break;
            
            
        // Services supprimés
            
        // Admin
        case 'admin_back':
            if (await isAdmin(userId)) {
                await showAdminMenu(chatId, userId, messageId);
            }
            break;
            
        case 'admin_welcome':
            if (await isAdmin(userId)) {
                userStates.set(userId, { ...state, state: 'waiting_welcome' });
                await sendOrEditMessage(
                    chatId,
                    '✏️ <b>Modifier le message d\'accueil</b>\n\n' +
                    'Envoyez le nouveau message.\n' +
                    'Utilisez {firstname} pour inclure le prénom.\n\n' +
                    '💡 <i>Astuce: Sélectionnez votre texte et utilisez le menu de formatage Telegram</i>',
                    [[{ text: '❌ Annuler', callback_data: 'admin_back' }]],
                    'HTML',
                    messageId
                );
            }
            break;
            
        case 'admin_photo':
            if (await isAdmin(userId)) {
                userStates.set(userId, { ...state, state: 'waiting_photo' });
                await sendOrEditMessage(
                    chatId,
                    '🖼️ <b>Modifier la photo d\'accueil</b>\n\n' +
                    'Envoyez la nouvelle photo.',
                    [[{ text: '❌ Annuler', callback_data: 'admin_back' }]],
                    'HTML',
                    messageId
                );
            }
            break;
            
        case 'admin_miniapp':
            if (await isAdmin(userId)) {
                const config = await db.getConfig();
                await sendOrEditMessage(
                    chatId,
                    '📱 <b>Mini Application</b>\n\n' +
                    `URL actuelle: ${config.mini_app_url || 'Non définie'}\n` +
                    `Texte du bouton: ${config.mini_app_text || '🎮 Ouvrir l\'application'}`,
                    [
                        [{ text: '🔗 Modifier URL', callback_data: 'edit_miniapp_url' }],
                        [{ text: '✏️ Modifier Texte', callback_data: 'edit_miniapp_text' }],
                        [{ text: '🔙 Retour', callback_data: 'admin_back' }]
                    ],
                    'HTML',
                    messageId
                );
            }
            break;
            
        case 'admin_social':
            if (await isAdmin(userId)) {
                await showSocialMenu(chatId, userId, messageId);
            }
            break;
            
        case 'admin_services':
            if (await isAdmin(userId)) {
                await sendOrEditMessage(
                    chatId,
                    '🚚 <b>Gérer les Services</b>\n\n' +
                    'Aucun service configuré.',
                    [
                        [{ text: '🔙 Retour', callback_data: 'admin_back' }]
                    ],
                    'HTML',
                    messageId
                );
            }
            break;
            
        case 'admin_stats':
            if (await isAdmin(userId)) {
                const stats = await db.getDetailedStats();
                await sendOrEditMessage(
                    chatId,
                    `📊 <b>Statistiques détaillées</b>\n\n` +
                    `👥 Total utilisateurs: ${stats.totalUsers}\n` +
                    `🚀 Démarrages: ${stats.totalStarts}\n` +
                    `👨‍💼 Administrateurs: ${stats.totalAdmins}\n` +
                    `📅 Utilisateurs aujourd'hui: ${stats.todayUsers}\n` +
                    `📈 Utilisateurs cette semaine: ${stats.weekUsers}`,
                    [[{ text: '🔙 Retour', callback_data: 'admin_back' }]],
                    'HTML',
                    messageId
                );
            }
            break;
            
        case 'admin_manage':
            if (await isAdmin(userId)) {
                await showAdminManagement(chatId, userId, messageId);
            }
            break;
            
        case 'admin_broadcast':
            if (await isAdmin(userId)) {
                userStates.set(userId, { ...state, state: 'waiting_broadcast' });
                await sendOrEditMessage(
                    chatId,
                    '📢 <b>Envoyer un message à tous</b>\n\n' +
                    'Envoyez le message que vous voulez diffuser à tous les utilisateurs.',
                    [[{ text: '❌ Annuler', callback_data: 'admin_back' }]],
                    'HTML',
                    messageId
                );
            }
            break;
            
        // Gestion des services supprimée
            
        // Autres callbacks
        default:
            // Gérer les callbacks des sous-menus, réseaux sociaux, etc.
            await handleOtherCallbacks(query);
    }
});

// Fonctions de services supprimées

// Afficher le menu des réseaux sociaux
async function showSocialMenu(chatId, userId, messageId) {
    const socialNetworks = await db.getSocialNetworks();
    
    const keyboard = [];
    
    // Afficher les réseaux existants
    for (const social of socialNetworks) {
        keyboard.push([{ 
            text: `${social.emoji} ${social.name}`, 
            callback_data: `edit_social_${social.id}` 
        }]);
    }
    
    keyboard.push([{ text: '➕ Ajouter un réseau', callback_data: 'add_social' }]);
    keyboard.push([{ text: '🔙 Retour', callback_data: 'admin_back' }]);
    
    await sendOrEditMessage(
        chatId,
        '🔗 <b>Gérer les Réseaux Sociaux</b>\n\n' +
        'Cliquez sur un réseau pour le modifier ou utilisez les options ci-dessous.',
        keyboard,
        'HTML',
        messageId
    );
}

// Afficher la gestion des admins
async function showAdminManagement(chatId, userId, messageId) {
    const admins = await db.getAdmins();
    
    let text = '👥 <b>Gestion des Administrateurs</b>\n\n';
    
    if (admins.length === 0) {
        text += '<i>Aucun administrateur trouvé</i>\n';
    } else {
        text += '<b>Administrateurs actuels :</b>\n';
        for (const admin of admins) {
            const isMainAdmin = admin.user_id.toString() === process.env.ADMIN_ID;
            const adminMark = isMainAdmin ? ' 👑' : '';
            text += `• ${admin.first_name || 'Admin'} `;
            if (admin.username) {
                text += `(@${admin.username})`;
            } else {
                text += `(ID: ${admin.user_id})`;
            }
            text += adminMark + '\n';
        }
        text += '\n<i>👑 = Administrateur principal (non supprimable)</i>';
    }
    
    const keyboard = [
        [{ text: '➕ Ajouter un admin', callback_data: 'add_admin' }],
        [{ text: '❌ Retirer un admin', callback_data: 'remove_admin' }],
        [{ text: '🔙 Retour', callback_data: 'admin_back' }]
    ];
    
    await sendOrEditMessage(chatId, text, keyboard, 'HTML', messageId);
}

// Gérer les autres callbacks
async function handleOtherCallbacks(query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const state = userStates.get(userId) || {};
    
    // Callbacks des services supprimés
    
    // Callbacks des sous-menus supprimés
    
    // Callbacks pour l'édition des réseaux sociaux
    if (data.startsWith('edit_social_') && !data.includes('_name_') && !data.includes('_emoji_') && !data.includes('_url_')) {
        const socialId = data.replace('edit_social_', '');
        await showSocialEditMenu(chatId, userId, socialId, messageId);
    }
    
    // Ajouter un réseau social
    else if (data === 'add_social') {
        userStates.set(userId, { ...state, state: 'adding_social_name' });
        await sendOrEditMessage(
            chatId,
            '➕ <b>Ajouter un réseau social</b>\n\n' +
            'Envoyez le nom du réseau (ex: Instagram):',
            [[{ text: '❌ Annuler', callback_data: 'admin_social' }]],
            'HTML',
            messageId
        );
    }
    
    // Mini app URL
    else if (data === 'edit_miniapp_url') {
        userStates.set(userId, { ...state, state: 'waiting_miniapp_url' });
        await sendOrEditMessage(
            chatId,
            '🔗 Envoyez la nouvelle URL de la mini application:',
            [[{ text: '❌ Annuler', callback_data: 'admin_miniapp' }]],
            'HTML',
            messageId
        );
    }
    
    // Mini app texte
    else if (data === 'edit_miniapp_text') {
        userStates.set(userId, { ...state, state: 'waiting_miniapp_text' });
        await sendOrEditMessage(
            chatId,
            '✏️ Envoyez le nouveau texte du bouton:',
            [[{ text: '❌ Annuler', callback_data: 'admin_miniapp' }]],
            'HTML',
            messageId
        );
    }
    
    // Callbacks pour l'ajout de photo au sous-menu - DOIT ÊTRE AVANT add_submenu_
    else if (data === 'add_submenu_photo_yes') {
        // Vérifier que les données nécessaires sont présentes
        if (!state.submenuName || !state.submenuText || !state.serviceType) {
            await sendOrEditMessage(
                chatId,
                '❌ Erreur: données du sous-menu perdues. Veuillez recommencer.',
                [[{ text: '🔙 Retour', callback_data: 'admin_services' }]],
                'HTML',
                messageId
            );
            return;
        }
        
        userStates.set(userId, { ...state, state: 'adding_submenu_photo' });
        await sendOrEditMessage(
            chatId,
            '📷 <b>Envoyez la photo pour ce sous-menu</b>\n\n' +
            '<i>Cette photo s\'affichera quand l\'utilisateur cliquera sur le sous-menu</i>',
            [[{ text: '❌ Annuler', callback_data: `manage_submenus_${state.serviceType}` }]],
            'HTML',
            messageId
        );
    }
    
    else if (data === 'add_submenu_photo_no') {
        // Vérifier que les données nécessaires sont présentes
        if (!state.submenuName || !state.submenuText || !state.serviceType) {
            await sendOrEditMessage(
                chatId,
                '❌ Erreur: données du sous-menu perdues. Veuillez recommencer.',
                [[{ text: '🔙 Retour', callback_data: 'admin_services' }]],
                'HTML',
                messageId
            );
            return;
        }
        
        // Créer le sous-menu sans photo
        const fullServiceType = state.serviceType === 'pos' ? 'postal' : 'postal';
        
        await db.addSubmenu(fullServiceType, state.submenuName, state.submenuText, null);
        
        await sendOrEditMessage(
            chatId,
            '✅ Sous-menu ajouté sans photo !',
            [[{ text: '🔙 Retour', callback_data: 'admin_services' }]],
            'HTML',
            messageId
        );
        
        // Nettoyer l'état
        userStates.set(userId, { messageId: messageId });
    }
    
    // Ajout de sous-menu supprimé
    
    // Callbacks des sous-menus supprimés
    
    // Modifier nom réseau social
    else if (data.startsWith('edit_social_name_')) {
        const socialId = data.replace('edit_social_name_', '');
        userStates.set(userId, { ...state, state: 'editing_social_name', socialId });
        await sendOrEditMessage(
            chatId,
            '✏️ Envoyez le nouveau nom:',
            [[{ text: '❌ Annuler', callback_data: `edit_social_${socialId}` }]],
            'HTML',
            messageId
        );
    }
    
    // Modifier emoji réseau social
    else if (data.startsWith('edit_social_emoji_')) {
        const socialId = data.replace('edit_social_emoji_', '');
        userStates.set(userId, { ...state, state: 'editing_social_emoji', socialId });
        await sendOrEditMessage(
            chatId,
            '😀 Envoyez le nouvel emoji:',
            [[{ text: '❌ Annuler', callback_data: `edit_social_${socialId}` }]],
            'HTML',
            messageId
        );
    }
    
    // Modifier URL réseau social
    else if (data.startsWith('edit_social_url_')) {
        const socialId = data.replace('edit_social_url_', '');
        userStates.set(userId, { ...state, state: 'editing_social_url', socialId });
        await sendOrEditMessage(
            chatId,
            '🔗 Envoyez la nouvelle URL:',
            [[{ text: '❌ Annuler', callback_data: `edit_social_${socialId}` }]],
            'HTML',
            messageId
        );
    }
    
    // Supprimer réseau social
    else if (data.startsWith('delete_social_')) {
        const socialId = data.replace('delete_social_', '');
        await db.deleteSocialNetwork(socialId);
        await sendOrEditMessage(
            chatId,
            '✅ Réseau social supprimé !',
            [[{ text: '🔙 Retour', callback_data: 'admin_social' }]],
            'HTML',
            messageId
        );
    }
    
    // Ajouter un admin
    else if (data === 'add_admin') {
        userStates.set(userId, { ...state, state: 'adding_admin' });
        await sendOrEditMessage(
            chatId,
            '➕ <b>Ajouter un administrateur</b>\n\n' +
            'Envoyez l\'ID Telegram ou le @username de l\'utilisateur:',
            [[{ text: '❌ Annuler', callback_data: 'admin_manage' }]],
            'HTML',
            messageId
        );
    }
    
    // Retirer un admin
    else if (data === 'remove_admin') {
        const admins = await db.getAdmins();
        const keyboard = [];
        
        for (const admin of admins) {
            if (admin.user_id.toString() !== process.env.ADMIN_ID) {
                keyboard.push([{ 
                    text: `❌ ${admin.first_name || 'Admin'} (@${admin.username || admin.user_id})`, 
                    callback_data: `confirm_remove_admin_${admin.user_id}` 
                }]);
            }
        }
        
        keyboard.push([{ text: '🔙 Retour', callback_data: 'admin_manage' }]);
        
        await sendOrEditMessage(
            chatId,
            '❌ <b>Retirer un administrateur</b>\n\n' +
            'Sélectionnez l\'admin à retirer:',
            keyboard,
            'HTML',
            messageId
        );
    }
    
    // Confirmer suppression admin
    else if (data.startsWith('confirm_remove_admin_')) {
        const adminId = parseInt(data.replace('confirm_remove_admin_', ''));
        await db.setAdmin(adminId, false);
        
        // Rafraîchir l'affichage des administrateurs
        await showAdminManagement(chatId, userId, messageId);
    }
    
    // Édition des sous-menus supprimée
}

// Gestion des messages texte
bot.on('message', async (msg) => {
    if (msg.text && (msg.text.startsWith('/start') || msg.text.startsWith('/admin'))) {
        return; // Ignorer les commandes
    }
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const state = userStates.get(userId) || {};
    
    if (!state.state) return;
    
    // Gestion du message d'accueil
    if (state.state === 'waiting_welcome') {
        // Convertir les entités Telegram en HTML
        const formattedText = parseMessageEntities(msg.text, msg.entities);
        await db.updateConfig({ welcome_message: formattedText });
        delete state.state;
        await sendOrEditMessage(
            chatId,
            '✅ Message d\'accueil mis à jour !',
            [[{ text: '🔙 Retour', callback_data: 'admin_back' }]],
            'HTML',
            state.messageId
        );
    }
    
    // Gestion du broadcast
    else if (state.state === 'waiting_broadcast') {
        const users = await db.getAllUsers();
        let sent = 0;
        
        // Convertir les entités Telegram en HTML
        const formattedText = parseMessageEntities(msg.text, msg.entities);
        
        for (const user of users) {
            try {
                await bot.sendMessage(user.user_id, formattedText, { parse_mode: 'HTML' });
                sent++;
            } catch (error) {
                console.log(`Erreur envoi à ${user.user_id}:`, error.message);
            }
        }
        
        delete state.state;
        await sendOrEditMessage(
            chatId,
            `✅ Message envoyé à ${sent}/${users.length} utilisateurs !`,
            [[{ text: '🔙 Retour', callback_data: 'admin_back' }]],
            'HTML',
            state.messageId
        );
    }
    
    // Gestion des textes des services supprimée
    
    // Gestion de l'ajout de réseau social
    else if (state.state === 'adding_social_name') {
        state.socialName = msg.text;
        state.state = 'adding_social_emoji';
        userStates.set(userId, state);
        
        await sendOrEditMessage(
            chatId,
            `📱 <b>${msg.text}</b>\n\n` +
            'Envoyez l\'emoji pour ce réseau (ex: 📷):',
            [[{ text: '❌ Annuler', callback_data: 'admin_social' }]],
            'HTML',
            state.messageId
        );
    }
    
    else if (state.state === 'adding_social_emoji') {
        state.socialEmoji = msg.text;
        state.state = 'adding_social_url';
        userStates.set(userId, state);
        
        await sendOrEditMessage(
            chatId,
            `${msg.text} <b>${state.socialName}</b>\n\n` +
            'Envoyez l\'URL du réseau:',
            [[{ text: '❌ Annuler', callback_data: 'admin_social' }]],
            'HTML',
            state.messageId
        );
    }
    
    else if (state.state === 'adding_social_url') {
        await db.addSocialNetwork(state.socialName, state.socialEmoji, msg.text);
        delete state.state;
        delete state.socialName;
        delete state.socialEmoji;
        
        await sendOrEditMessage(
            chatId,
            '✅ Réseau social ajouté !',
            [[{ text: '🔙 Retour', callback_data: 'admin_social' }]],
            'HTML',
            state.messageId
        );
    }
    
    // Gestion mini app
    else if (state.state === 'waiting_miniapp_url') {
        await db.updateConfig({ mini_app_url: msg.text });
        delete state.state;
        await sendOrEditMessage(
            chatId,
            '✅ URL de la mini application mise à jour !',
            [[{ text: '🔙 Retour', callback_data: 'admin_miniapp' }]],
            'HTML',
            state.messageId
        );
    }
    
    else if (state.state === 'waiting_miniapp_text') {
        await db.updateConfig({ mini_app_text: msg.text });
        delete state.state;
        await sendOrEditMessage(
            chatId,
            '✅ Texte du bouton mis à jour !',
            [[{ text: '🔙 Retour', callback_data: 'admin_miniapp' }]],
            'HTML',
            state.messageId
        );
    }
    
    // Gestion des sous-menus supprimée
    
    
    // Gestion de la modification des réseaux sociaux
    else if (state.state === 'editing_social_name') {
        await db.updateSocialNetwork(state.socialId, { name: msg.text });
        delete state.state;
        delete state.socialId;
        
        await sendOrEditMessage(
            chatId,
            '✅ Nom du réseau social mis à jour !',
            [[{ text: '🔙 Retour', callback_data: 'admin_social' }]],
            'HTML',
            state.messageId
        );
    }
    
    else if (state.state === 'editing_social_emoji') {
        await db.updateSocialNetwork(state.socialId, { emoji: msg.text });
        delete state.state;
        delete state.socialId;
        
        await sendOrEditMessage(
            chatId,
            '✅ Emoji du réseau social mis à jour !',
            [[{ text: '🔙 Retour', callback_data: 'admin_social' }]],
            'HTML',
            state.messageId
        );
    }
    
    else if (state.state === 'editing_social_url') {
        await db.updateSocialNetwork(state.socialId, { url: msg.text });
        delete state.state;
        delete state.socialId;
        
        await sendOrEditMessage(
            chatId,
            '✅ URL du réseau social mise à jour !',
            [[{ text: '🔙 Retour', callback_data: 'admin_social' }]],
            'HTML',
            state.messageId
        );
    }
    
    // Gestion de l'ajout d'admin
    else if (state.state === 'adding_admin') {
        let newAdminId;
        
        // Si c'est un username
        if (msg.text.startsWith('@')) {
            const username = msg.text.substring(1);
            const users = await db.getAllUsers();
            const user = users.find(u => u.username === username);
            
            if (user) {
                newAdminId = user.user_id;
            } else {
                await sendOrEditMessage(
                    chatId,
                    '❌ Utilisateur non trouvé. Il doit d\'abord utiliser le bot.',
                    [[{ text: '🔙 Retour', callback_data: 'admin_manage' }]],
                    'HTML',
                    state.messageId
                );
                delete state.state;
                return;
            }
        } else {
            // C'est un ID
            newAdminId = parseInt(msg.text);
            
            // Vérifier si l'utilisateur existe
            const user = await db.getUser(newAdminId);
            if (!user) {
                // Créer l'utilisateur s'il n'existe pas
                await db.upsertUser(newAdminId, null, 'Nouvel Admin', null);
            }
        }
        
        await db.setAdmin(newAdminId, true);
        delete state.state;
        
        // Rafraîchir l'affichage des administrateurs
        await showAdminManagement(chatId, userId, state.messageId);
    }
    
    // Modification des sous-menus supprimée
});

// Gestion des photos
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const state = userStates.get(userId) || {};
    
    if (!state.state) return;
    
    const photo = msg.photo[msg.photo.length - 1].file_id;
    
    // Photo d'accueil
    if (state.state === 'waiting_photo') {
        await db.updateConfig({ welcome_image: photo });
        delete state.state;
        await sendOrEditMessage(
            chatId,
            '✅ Photo d\'accueil mise à jour !',
            [[{ text: '🔙 Retour', callback_data: 'admin_back' }]],
            'HTML',
            state.messageId
        );
    }
    
    // Photos des services supprimées
    
    // Photo d'un sous-menu (modification)
    else if (state.state === 'editing_submenu_photo') {
        await db.updateSubmenu(state.submenuId, { image: photo });
        delete state.state;
        delete state.submenuId;
        delete state.serviceType;
        
        await sendOrEditMessage(
            chatId,
            '✅ Photo du sous-menu mise à jour !',
            [[{ text: '🔙 Retour', callback_data: 'admin_services' }]],
            'HTML',
            state.messageId
        );
    }
    
    // Photos des sous-menus supprimées
});

// Fonctions de sous-menus supprimées

// Menu d'édition d'un réseau social
async function showSocialEditMenu(chatId, userId, socialId, messageId) {
    const social = await db.getSocialNetwork(socialId);
    
    if (!social) {
        await sendOrEditMessage(
            chatId,
            '❌ Réseau social non trouvé',
            [[{ text: '🔙 Retour', callback_data: 'admin_social' }]],
            'HTML',
            messageId
        );
        return;
    }
    
    await sendOrEditMessage(
        chatId,
        `${social.emoji} <b>${social.name}</b>\n\n` +
        `URL: ${social.url}\n` +
        `Position: ${social.position}`,
        [
            [{ text: '✏️ Modifier le nom', callback_data: `edit_social_name_${socialId}` }],
            [{ text: '😀 Modifier l\'emoji', callback_data: `edit_social_emoji_${socialId}` }],
            [{ text: '🔗 Modifier l\'URL', callback_data: `edit_social_url_${socialId}` }],
            [{ text: '🗑️ Supprimer', callback_data: `delete_social_${socialId}` }],
            [{ text: '🔙 Retour', callback_data: 'admin_social' }]
        ],
        'HTML',
        messageId
    );
}

// Fonction d'édition des sous-menus supprimée

// Démarrage du bot
bot.on('polling_error', (error) => {
    console.error('Erreur de polling:', error);
});

console.log('🤖 Bot démarré avec succès !');
console.log('📊 Utilisation de Cloudflare D1 pour la base de données');
console.log('✅ Toutes les fonctionnalités sont actives');