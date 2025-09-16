const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🗑️  Čištění databáze...\n');

  try {
    console.log('📊 Současný stav databáze:');
    
    // Zjisti současný stav
    const accounts = await prisma.account.count();
    const transactions = await prisma.transaction.count();
    const connections = await prisma.connection.count();
    const institutions = await prisma.institution.count();
    
    console.log(`  - Účty: ${accounts}`);
    console.log(`  - Transakce: ${transactions}`);
    console.log(`  - Připojení: ${connections}`);
    console.log(`  - Instituce: ${institutions}`);
    console.log('');

    if (accounts === 0 && transactions === 0 && connections === 0 && institutions === 0) {
      console.log('✅ Databáze je už prázdná!');
      return;
    }

    console.log('🧹 Mažu data...');
    
    // Maž v správném pořadí (kvůli foreign keys)
    console.log('  🗑️  Mažu transakce...');
    const deletedTx = await prisma.transaction.deleteMany({});
    console.log(`    ✅ Smazáno ${deletedTx.count} transakcí`);
    
    console.log('  🗑️  Mažu účty...');
    const deletedAccounts = await prisma.account.deleteMany({});
    console.log(`    ✅ Smazáno ${deletedAccounts.count} účtů`);
    
    console.log('  🗑️  Mažu připojení...');
    const deletedConnections = await prisma.connection.deleteMany({});
    console.log(`    ✅ Smazáno ${deletedConnections.count} připojení`);
    
    console.log('  🗑️  Mažu instituce...');
    const deletedInstitutions = await prisma.institution.deleteMany({});
    console.log(`    ✅ Smazáno ${deletedInstitutions.count} institucí`);
    
    console.log('\n🎉 Databáze vyčištěna!');
    console.log('💡 Můžeš nyní připojit banku znovu s čistým stavem');
    
  } catch (error) {
    console.error('❌ Chyba při čištění databáze:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

async function resetToMockData() {
  console.log('🔄 Reset na mock data...\n');
  
  try {
    // Nejdřív vyčisti
    await cleanDatabase();
    
    console.log('📦 Načítám mock data...');
    
    // Spusť seed
    const { spawn } = require('child_process');
    
    const seedProcess = spawn('npx', ['prisma', 'db', 'seed'], {
      stdio: 'inherit',
      shell: true
    });
    
    seedProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Mock data načtena!');
      } else {
        console.error('❌ Chyba při načítání mock dat');
      }
    });
    
  } catch (error) {
    console.error('❌ Chyba při resetu:', error.message);
  }
}

// Spusť podle argumentu
const action = process.argv[2];

if (action === 'clean') {
  cleanDatabase();
} else if (action === 'reset') {
  resetToMockData();
} else {
  console.log('🗑️  Databáze Manager');
  console.log('===================\n');
  console.log('Použití:');
  console.log('  node db-clean.js clean  - Smaže všechna data');
  console.log('  node db-clean.js reset  - Smaže data a načte mock data');
  console.log('');
  console.log('📊 Současný stav:');
  
  // Zobraz současný stav
  (async () => {
    try {
      const accounts = await prisma.account.count();
      const transactions = await prisma.transaction.count();
      const connections = await prisma.connection.count();
      const institutions = await prisma.institution.count();
      
      console.log(`  - Účty: ${accounts}`);
      console.log(`  - Transakce: ${transactions}`);
      console.log(`  - Připojení: ${connections}`);
      console.log(`  - Instituce: ${institutions}`);
      
      if (accounts > 0 || transactions > 0 || connections > 0 || institutions > 0) {
        console.log('\n💡 Pro vyčištění spusť: node db-clean.js clean');
      }
      
    } catch (error) {
      console.error('❌ Chyba při čtení databáze:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  })();
} 