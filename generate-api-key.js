// Genera una API key aleatoria y la imprime para agregar al .env
// Uso: node generate-api-key.js
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex');
console.log('\nAPI Key generada:');
console.log(`API_KEY=${key}`);
console.log('\nAgregar esta línea al archivo .env\n');
