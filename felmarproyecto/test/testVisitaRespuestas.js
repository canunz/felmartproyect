// test/testVisitaRespuestas.js
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const baseURL = 'http://localhost:3000';

async function testVisitaRespuestas() {
    console.log('🧪 Iniciando pruebas de respuestas de visitas...\n');

    try {
        // Crear un cookie jar y un cliente axios con soporte de cookies
        const jar = new CookieJar();
        const client = wrapper(axios.create({
            baseURL,
            withCredentials: true,
            jar
        }));

        // 1. Probar login de cliente
        console.log('1. Probando login de cliente...');
        const loginResponse = await client.post('/login', {
            email: 'cliente@test.com',
            password: '123456'
        });

        if (loginResponse.status === 200) {
            console.log('✅ Login exitoso');
            
            // 2. Probar obtener visitas del cliente
            console.log('\n2. Probando obtener visitas del cliente...');
            try {
                const visitasResponse = await client.get('/clientes/api/mis-visitas');
                
                console.log('✅ Visitas obtenidas correctamente');
                console.log('   Status:', visitasResponse.status);
                console.log('   Cantidad de visitas:', visitasResponse.data.length);
                console.log('   Datos de visitas:', visitasResponse.data);
                
                if (visitasResponse.data.length > 0) {
                    const primeraVisita = visitasResponse.data[0];
                    
                    // 3. Probar aceptar visita
                    console.log('\n3. Probando aceptar visita...');
                    try {
                        const aceptarResponse = await client.put(`/clientes/api/visitas/${primeraVisita.id}/aceptar`, {});
                        
                        console.log('✅ Visita aceptada correctamente');
                        console.log('   Status:', aceptarResponse.status);
                        console.log('   Respuesta:', aceptarResponse.data);
                        
                    } catch (error) {
                        console.log('❌ Error al aceptar visita:');
                        console.log('   Status:', error.response?.status);
                        console.log('   Message:', error.response?.data?.message || error.message);
                    }
                    
                    // 4. Probar rechazar visita
                    console.log('\n4. Probando rechazar visita...');
                    try {
                        const rechazarResponse = await client.put(`/clientes/api/visitas/${primeraVisita.id}/rechazar`, {
                            motivo: 'Prueba de rechazo desde test'
                        });
                        
                        console.log('✅ Visita rechazada correctamente');
                        console.log('   Status:', rechazarResponse.status);
                        console.log('   Respuesta:', rechazarResponse.data);
                        
                    } catch (error) {
                        console.log('❌ Error al rechazar visita:');
                        console.log('   Status:', error.response?.status);
                        console.log('   Message:', error.response?.data?.message || error.message);
                    }
                } else {
                    console.log('⚠️  No hay visitas para probar');
                }
                
            } catch (error) {
                console.log('❌ Error al obtener visitas:');
                console.log('   Status:', error.response?.status);
                console.log('   Message:', error.response?.data?.message || error.message);
                console.log('   Data:', error.response?.data);
            }
            
        } else {
            console.log('❌ Login falló');
        }
        
    } catch (error) {
        console.log('❌ Error general en las pruebas:');
        console.log('   Message:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', error.response.data);
        }
    }
    
    console.log('\n🏁 Pruebas completadas');
}

// Ejecutar las pruebas
testVisitaRespuestas(); 