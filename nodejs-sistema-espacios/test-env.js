// Test para verificar las variables de entorno
const path = require('path');

console.log('1. Antes de cargar dotenv:');
console.log('   DB_TYPE:', process.env.DB_TYPE);

require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('2. Después de cargar dotenv:');
console.log('   DB_TYPE:', process.env.DB_TYPE);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);

console.log('3. Antes de require config:');
console.log('   DB_TYPE:', process.env.DB_TYPE);

const config = require('./config/config');

console.log('4. Config obtenido:');
console.log('   database.type:', config.database.type);
console.log('   server.port:', config.server.port);

console.log('5. Después de require config:');
console.log('   DB_TYPE:', process.env.DB_TYPE);
