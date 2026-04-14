#!/usr/bin/env node

/**
 * Script para configurar RAILWAY_TOKEN como secret no GitHub
 * Uso: node configure-github-secret.js <GITHUB_TOKEN> <RAILWAY_TOKEN>
 */

const https = require('https');

const RAILWAY_TOKEN = process.argv[3] || '03fffa2f-c5d9-4c52-8a8c-93ab7048336c';
const GITHUB_TOKEN = process.argv[2];
const REPO_OWNER = 'tenangelo';
const REPO_NAME = 'Zeus-Financeiro';

if (!GITHUB_TOKEN) {
  console.log('❌ GitHub token não fornecido!');
  console.log('');
  console.log('📋 Instruções para configurar manualmente:');
  console.log('');
  console.log('1. Acesse: https://github.com/tenangelo/Zeus-Financeiro/settings/secrets/actions');
  console.log('2. Clique em "New repository secret"');
  console.log('3. Nome: RAILWAY_TOKEN');
  console.log(`4. Value: ${RAILWAY_TOKEN}`);
  console.log('5. Clique em "Add secret"');
  console.log('');
  console.log('Ou execute com seu token do GitHub:');
  console.log(`  node configure-github-secret.js <SEU_GITHUB_TOKEN>`);
  process.exit(1);
}

console.log('🚀 Configurando RAILWAY_TOKEN no GitHub...');
console.log(`Repository: ${REPO_OWNER}/${REPO_NAME}`);
console.log(`Token: ${RAILWAY_TOKEN.substring(0, 10)}...`);
console.log('');

const options = {
  hostname: 'api.github.com',
  path: `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/RAILWAY_TOKEN`,
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Zeus-Financeiro-Setup'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 204) {
      console.log('✅ Secret RAILWAY_TOKEN configurado com sucesso!');
      console.log('💡 O GitHub Actions começará a fazer deploy no Railway automaticamente.');
      console.log('');
      console.log('📊 Próximos passos:');
      console.log('1. Aguarde o GitHub Actions rodar (https://github.com/tenangelo/Zeus-Financeiro/actions)');
      console.log('2. Veja o deploy do Railway em https://railway.app');
      console.log('3. Quando Railway estiver READY, atualize NEXT_PUBLIC_API_URL no Vercel');
    } else {
      console.log(`❌ Erro: ${res.statusCode}`);
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erro na requisição:', e.message);
});

req.write(JSON.stringify({ encrypted_value: RAILWAY_TOKEN, key_id: 'dummy' }));
req.end();
