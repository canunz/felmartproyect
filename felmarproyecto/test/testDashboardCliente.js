// test/testDashboardCliente.js
const { Usuario, Cliente, SolicitudRetiro, VisitaRetiro } = require('../models');
const sequelize = require('../config/database');

async function testDashboardCliente() {
    try {
        console.log('🔍 Iniciando prueba del dashboard del cliente...');
        
        // 1. Buscar un usuario cliente
        const usuarioCliente = await Usuario.findOne({
            where: { rol: 'cliente' },
            include: [{ model: Cliente }]
        });
        
        if (!usuarioCliente) {
            console.log('❌ No se encontró ningún usuario cliente');
            return;
        }
        
        console.log('✅ Usuario cliente encontrado:', {
            id: usuarioCliente.id,
            nombre: usuarioCliente.nombre,
            email: usuarioCliente.email,
            rol: usuarioCliente.rol
        });
        
        // 2. Verificar si tiene cliente asociado
        const cliente = await Cliente.findOne({
            where: { usuario_id: usuarioCliente.id }
        });
        
        if (!cliente) {
            console.log('⚠️  Usuario cliente no tiene perfil de cliente asociado');
        } else {
            console.log('✅ Cliente encontrado:', {
                rut: cliente.rut,
                nombre_empresa: cliente.nombre_empresa
            });
            
            // 3. Buscar solicitudes del cliente
            const solicitudes = await SolicitudRetiro.findAll({
                where: { cliente_id: cliente.rut },
                order: [['createdAt', 'DESC']]
            });
            
            console.log(`📋 Solicitudes encontradas: ${solicitudes.length}`);
            solicitudes.forEach(s => {
                console.log(`  - ID: ${s.id}, Estado: ${s.estado}, Descripción: ${s.descripcion}`);
            });
            
            // 4. Buscar visitas del cliente
            const visitas = await VisitaRetiro.findAll({
                where: { clienteId: cliente.rut }
            });
            
            console.log(`🚚 Visitas encontradas: ${visitas.length}`);
            visitas.forEach(v => {
                console.log(`  - ID: ${v.id}, Fecha: ${v.fecha}, Estado: ${v.estado}`);
            });
            
            // 5. Calcular estadísticas
            const misSolicitudes = solicitudes.length;
            const solicitudesPendientes = solicitudes.filter(s => s.estado.toLowerCase() === 'pendiente').length;
            const proximasVisitas = visitas.filter(v => 
                new Date(v.fecha) >= new Date() && 
                ['pendiente', 'confirmada'].includes(v.estado.toLowerCase())
            ).length;
            
            console.log('📊 Estadísticas del cliente:');
            console.log(`  - Total solicitudes: ${misSolicitudes}`);
            console.log(`  - Solicitudes pendientes: ${solicitudesPendientes}`);
            console.log(`  - Próximas visitas: ${proximasVisitas}`);
        }
        
        console.log('✅ Prueba del dashboard del cliente completada');
        
    } catch (error) {
        console.error('❌ Error en la prueba del dashboard del cliente:', error);
    } finally {
        await sequelize.close();
    }
}

// Ejecutar la prueba
testDashboardCliente(); 