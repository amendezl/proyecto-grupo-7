#!/usr/bin/env node

// Script de prueba para verificar el sistema serverless
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({
                        status: res.statusCode,
                        data: parsedData
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAPI() {
    console.log('🧪 Iniciando pruebas del API...\n');

    try {
        // Test 1: Registrar un usuario administrador
        console.log('1. Registrando usuario administrador...');
        const registerResponse = await makeRequest('POST', '/api/auth/register', {
            nombre: 'Admin',
            apellido: 'Hospital',
            email: 'admin@hospital.com',
            password: 'password123',
            rol: 'admin'
        });
        console.log('   Status:', registerResponse.status);
        console.log('   Respuesta:', JSON.stringify(registerResponse.data, null, 2));

        // Test 2: Login
        console.log('\n2. Iniciando sesión...');
        const loginResponse = await makeRequest('POST', '/api/auth/login', {
            email: 'admin@hospital.com',
            password: 'password123'
        });
        console.log('   Status:', loginResponse.status);
        
        let token = null;
        if (loginResponse.data.success && loginResponse.data.data.token) {
            token = loginResponse.data.data.token;
            console.log('   ✅ Login exitoso! Token obtenido.');
        } else {
            console.log('   ❌ Login falló:', JSON.stringify(loginResponse.data, null, 2));
        }

        if (token) {
            // Test 3: Dashboard
            console.log('\n3. Accediendo al dashboard...');
            const dashboardResponse = await makeRequest('GET', '/api/dashboard', null, token);
            console.log('   Status:', dashboardResponse.status);
            if (dashboardResponse.data.success) {
                console.log('   ✅ Dashboard obtenido correctamente');
                console.log('   Usuario:', dashboardResponse.data.data.usuario.nombre, dashboardResponse.data.data.usuario.apellido);
            } else {
                console.log('   ❌ Error en dashboard:', JSON.stringify(dashboardResponse.data, null, 2));
            }

            // Test 4: Crear un espacio
            console.log('\n4. Creando un espacio...');
            const espacioResponse = await makeRequest('POST', '/api/espacios', {
                nombre: 'Quirófano 1',
                tipo: 'quirofano',
                capacidad: 10,
                ubicacion: 'Piso 2, Ala Sur',
                descripcion: 'Quirófano principal para cirugías generales'
            }, token);
            console.log('   Status:', espacioResponse.status);
            if (espacioResponse.data.success) {
                console.log('   ✅ Espacio creado correctamente');
                console.log('   ID:', espacioResponse.data.data.id);
            } else {
                console.log('   ❌ Error creando espacio:', JSON.stringify(espacioResponse.data, null, 2));
            }

            // Test 5: Listar espacios
            console.log('\n5. Listando espacios...');
            const espaciosResponse = await makeRequest('GET', '/api/espacios', null, token);
            console.log('   Status:', espaciosResponse.status);
            if (espaciosResponse.data.success) {
                console.log('   ✅ Espacios listados correctamente');
                console.log('   Total espacios:', espaciosResponse.data.data.total);
            } else {
                console.log('   ❌ Error listando espacios:', JSON.stringify(espaciosResponse.data, null, 2));
            }
        }

        console.log('\n🎉 Pruebas completadas!');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Asegúrate de que el servidor esté ejecutándose en http://localhost:3000');
            console.log('   Ejecuta: npm run dev');
        }
    }
}

// Ejecutar las pruebas
testAPI();
