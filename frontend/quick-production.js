const fs = require('fs');

console.log('⚡ Rychlé přepnutí na produkci');
console.log('==============================\n');

console.log('❌ Současný stav: SANDBOX mode');
console.log('✅ Cíl: PRODUCTION mode\n');

console.log('🔧 Možnosti:');
console.log('');
console.log('1️⃣  MÁTE-LI PRODUKČNÍ CREDENTIALS:');
console.log('   - Upravte tento soubor (quick-production.js)');
console.log('   - Nahraďte YOUR_PROD_SECRET_ID a YOUR_PROD_SECRET_KEY');
console.log('   - Spusťte: node quick-production.js');
console.log('');
console.log('2️⃣  NEMÁTE-LI PRODUKČNÍ CREDENTIALS:');
console.log('   - Přihlaste se na: https://manage.gocardless.com/');
console.log('   - Jděte na: Developers → API Keys');
console.log('   - Zkopírujte PRODUCTION credentials');
console.log('   - Poté použijte možnost 1️⃣');
console.log('');

// NAHRAĎTE TYTO HODNOTY VAŠIMI PRODUKČNÍMI CREDENTIALS:
const PROD_SECRET_ID = "YOUR_PROD_SECRET_ID";
const PROD_SECRET_KEY = "YOUR_PROD_SECRET_KEY";

if (PROD_SECRET_ID === "YOUR_PROD_SECRET_ID" || PROD_SECRET_KEY === "YOUR_PROD_SECRET_KEY") {
  console.log('⚠️  POZOR: Nejdříve nahraďte credentials v tomto souboru!');
  console.log('');
  console.log('📝 Upravte soubor quick-production.js:');
  console.log(`   - Řádek s PROD_SECRET_ID`);
  console.log(`   - Řádek s PROD_SECRET_KEY`);
  console.log('   - Poté spusťte znovu: node quick-production.js');
  process.exit(1);
}

// Create production .env
const envContent = `DATABASE_URL="file:./dev.db"
GC_SECRET_ID="${PROD_SECRET_ID}"
GC_SECRET_KEY="${PROD_SECRET_KEY}"
GC_SANDBOX="false"
`;

// Backup current .env
fs.copyFileSync('.env', '.env.sandbox-backup');
console.log('📦 Sandbox .env zálohován jako .env.sandbox-backup');

// Write production .env
fs.writeFileSync('.env', envContent);
console.log('✅ Produkční credentials nastaveny');

console.log('\n🎯 Hotovo!');
console.log('1. Restartuj server (Ctrl+C a npm run dev)');
console.log('2. Měl bys vidět "🏦 Using GoCardless PRODUCTION environment"');
console.log('3. Aplikace bude fungovat s produkčními daty');

// Test credentials
setTimeout(async () => {
  try {
    require('dotenv').config();
    const { GoCardlessAdapter } = require('./src/lib/gocardless.ts');
    
    const adapter = new GoCardlessAdapter();
    const institutions = await adapter.getInstitutions();
    
    console.log(`\n✅ SUCCESS! ${institutions.length} bank v produkci`);
    console.log('🎉 Aplikace je připravena!');
    
  } catch (error) {
    console.error('\n❌ Chyba při testování:', error.message);
    console.log('💡 Zkontroluj credentials v GoCardless Dashboard');
  }
}, 1000); 