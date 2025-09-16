const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🏦 Nastavení produkčních GoCardless credentials');
console.log('==============================================\n');

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setProduction() {
  try {
    console.log('📋 Potřebuji tvoje PRODUKČNÍ credentials z GoCardless:');
    console.log('   (ty které fungovaly v řádku 594-600 v předchozích testech)\n');

    const secretId = await askQuestion('🔑 Zadej Production Secret ID: ');
    
    if (!secretId || secretId.trim() === '') {
      console.log('❌ Secret ID je povinné');
      rl.close();
      return;
    }

    const secretKey = await askQuestion('🔑 Zadej Production Secret Key: ');
    
    if (!secretKey || secretKey.trim() === '') {
      console.log('❌ Secret Key je povinné');
      rl.close();
      return;
    }

    // Create production .env
    const envContent = `DATABASE_URL="file:./dev.db"
GC_SECRET_ID="${secretId.trim()}"
GC_SECRET_KEY="${secretKey.trim()}"
GC_SANDBOX="false"
`;

    // Backup current .env
    fs.copyFileSync('.env', '.env.sandbox-backup');
    console.log('📦 Sandbox .env zálohován jako .env.sandbox-backup');

    // Write production .env
    fs.writeFileSync('.env', envContent);
    console.log('✅ Produkční credentials nastaveny');
    
    console.log('\n🎯 Další kroky:');
    console.log('1. Restartuj server (Ctrl+C a npm run dev)');
    console.log('2. Měl bys vidět "🏦 Using GoCardless PRODUCTION environment"');
    console.log('3. Otevři http://localhost:3000');
    console.log('4. Aplikace bude fungovat s produkčními daty');

    // Test credentials
    console.log('\n🧪 Testování credentials...');
    setTimeout(async () => {
      try {
        require('dotenv').config();
        const { GoCardlessAdapter } = require('./src/lib/gocardless.ts');
        
        const adapter = new GoCardlessAdapter();
        const institutions = await adapter.getInstitutions();
        
        console.log(`✅ SUCCESS! ${institutions.length} bank v produkci`);
        
        const czechBanks = institutions.filter(i => 
          i.name.toLowerCase().includes('air bank') || 
          i.name.toLowerCase().includes('creditas') ||
          i.name.toLowerCase().includes('česká') ||
          i.name.toLowerCase().includes('fio')
        );
        
        if (czechBanks.length > 0) {
          console.log('🇨🇿 České banky dostupné:');
          czechBanks.forEach(bank => console.log(`  - ${bank.name}`));
        }
        
      } catch (error) {
        console.error('❌ Chyba při testování:', error.message);
        console.log('💡 Zkontroluj credentials a zkus znovu');
      } finally {
        rl.close();
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Chyba:', error.message);
    rl.close();
  }
}

setProduction(); 