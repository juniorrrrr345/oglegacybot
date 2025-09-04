#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration du projet
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Test de configuration du projet...\n');

// Vérifier les fichiers essentiels
const requiredFiles = [
    'package.json',
    '.env.example',
    'Dockerfile',
    'docker-compose.yml',
    'deploy.sh',
    'src/main.js',
    'src/bot.js',
    'src/admin-server.js',
    'src/database.js',
    'src/setup-database.js',
    'views/layout.ejs',
    'views/login.ejs',
    'views/dashboard.ejs',
    'public/css/admin.css',
    'public/js/admin.js'
];

let allFilesExist = true;

console.log('📁 Vérification des fichiers:');
requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - MANQUANT`);
        allFilesExist = false;
    }
});

// Vérifier les dossiers
const requiredDirs = [
    'src',
    'views', 
    'public',
    'public/css',
    'public/js',
    'data',
    'uploads',
    'logs',
    'nginx',
    'nginx/conf.d'
];

console.log('\n📂 Vérification des dossiers:');
requiredDirs.forEach(dir => {
    if (fs.existsSync(path.join(__dirname, dir))) {
        console.log(`   ✅ ${dir}/`);
    } else {
        console.log(`   ❌ ${dir}/ - MANQUANT`);
        allFilesExist = false;
    }
});

// Vérifier le package.json
console.log('\n📦 Vérification du package.json:');
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    
    const requiredDeps = ['telegraf', 'express', 'sqlite3', 'ejs', 'bcryptjs', 'multer'];
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
            console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
        } else {
            console.log(`   ❌ ${dep} - MANQUANT`);
            allFilesExist = false;
        }
    });
} catch (error) {
    console.log('   ❌ Erreur lecture package.json:', error.message);
    allFilesExist = false;
}

// Vérifier le fichier .env
console.log('\n🔐 Vérification de la configuration:');
if (fs.existsSync(path.join(__dirname, '.env'))) {
    console.log('   ✅ Fichier .env trouvé');
    
    // Lire et vérifier les variables importantes
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
    
    requiredEnvVars.forEach(varName => {
        if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
            console.log(`   ✅ ${varName} configuré`);
        } else {
            console.log(`   ⚠️  ${varName} non configuré ou utilise une valeur par défaut`);
        }
    });
} else {
    console.log('   ⚠️  Fichier .env non trouvé - copiez .env.example vers .env');
}

// Vérifier les permissions des scripts
console.log('\n🔧 Vérification des permissions:');
const executableFiles = ['deploy.sh', 'docker-entrypoint.sh'];
executableFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        try {
            fs.accessSync(path.join(__dirname, file), fs.constants.X_OK);
            console.log(`   ✅ ${file} est exécutable`);
        } catch (error) {
            console.log(`   ⚠️  ${file} n'est pas exécutable - utilisez: chmod +x ${file}`);
        }
    }
});

// Résumé
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
    console.log('🎉 Configuration du projet: OK');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Copiez .env.example vers .env');
    console.log('2. Configurez vos variables dans .env');
    console.log('3. Lancez: npm install');
    console.log('4. Lancez: npm run setup-db');
    console.log('5. Lancez: npm start');
    console.log('6. Ou déployez avec: ./deploy.sh');
} else {
    console.log('❌ Configuration du projet: ERREURS DÉTECTÉES');
    console.log('\n🔧 Corrigez les erreurs ci-dessus avant de continuer');
}
console.log('='.repeat(50));