// test/testRutasVisitas.js
const axios = require('axios');

async function testRutasVisitas() {
    const baseURL = 'http://localhost:3000';
    
    console.log('🧪 Probando rutas de visitas...\n');
    
    try {
        // 0. Probar que el servidor responde
        console.log('0. Probando que el servidor responde...');
        try {
            const response = await axios.get(`${baseURL}/`);
            console.log('✅ Servidor responde correctamente');
            console.log('   Status:', response.status);
        } catch (error) {
            console.log('❌ Error al conectar con el servidor:');
            console.log('   Error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.log('   El servidor no está corriendo en el puerto 3000');
                return;
            }
        }
        
        // 1. Probar ruta de aceptar visita (debería fallar por falta de autenticación)
        console.log('\n1. Probando ruta PUT /clientes/api/visitas/1/aceptar...');
        try {
            const response = await axios.put(`${baseURL}/clientes/api/visitas/1/aceptar`, {}, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Ruta aceptar visita responde correctamente');
            console.log('   Status:', response.status);
            console.log('   Data:', response.data);
        } catch (error) {
            console.log('📋 Respuesta de ruta aceptar visita:');
            console.log('   Status:', error.response?.status);
            console.log('   Message:', error.response?.data?.message || error.message);
            if (error.response?.status === 401) {
                console.log('   ✅ Correcto: Requiere autenticación');
            } else if (error.response?.status === 404) {
                console.log('   ❌ Error: Ruta no encontrada');
            }
        }
        
        // 2. Probar ruta de rechazar visita (debería fallar por falta de autenticación)
        console.log('\n2. Probando ruta PUT /clientes/api/visitas/1/rechazar...');
        try {
            const response = await axios.put(`${baseURL}/clientes/api/visitas/1/rechazar`, {
                motivoRechazo: 'Prueba de rechazo'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Ruta rechazar visita responde correctamente');
            console.log('   Status:', response.status);
            console.log('   Data:', response.data);
        } catch (error) {
            console.log('📋 Respuesta de ruta rechazar visita:');
            console.log('   Status:', error.response?.status);
            console.log('   Message:', error.response?.data?.message || error.message);
            if (error.response?.status === 401) {
                console.log('   ✅ Correcto: Requiere autenticación');
            } else if (error.response?.status === 404) {
                console.log('   ❌ Error: Ruta no encontrada');
            }
        }
        
        // 3. Probar ruta de obtener visitas (debería fallar por falta de autenticación)
        console.log('\n3. Probando ruta GET /clientes/api/mis-visitas...');
        try {
            const response = await axios.get(`${baseURL}/clientes/api/mis-visitas`);
            console.log('✅ Ruta obtener visitas responde correctamente');
            console.log('   Status:', response.status);
            console.log('   Data length:', Array.isArray(response.data) ? response.data.length : 'No es array');
        } catch (error) {
            console.log('📋 Respuesta de ruta obtener visitas:');
            console.log('   Status:', error.response?.status);
            console.log('   Message:', error.response?.data?.message || error.message);
            if (error.response?.status === 401) {
                console.log('   ✅ Correcto: Requiere autenticación');
            } else if (error.response?.status === 404) {
                console.log('   ❌ Error: Ruta no encontrada');
            }
        }
        
        // 4. Probar rutas incorrectas para verificar que devuelven 404
        console.log('\n4. Probando rutas incorrectas...');
        try {
            await axios.put(`${baseURL}/api/visitas/1/aceptar`);
            console.log('❌ Ruta incorrecta no debería funcionar');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ Ruta incorrecta devuelve 404 como esperado');
            } else {
                console.log('⚠️  Ruta incorrecta devuelve:', error.response?.status);
            }
        }
        
    } catch (error) {
        console.error('💥 Error general:', error.message);
    }
}

// Ejecutar las pruebas
testRutasVisitas()
    .then(() => {
        console.log('\n🏁 Pruebas de rutas finalizadas');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    }); 