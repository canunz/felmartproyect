const { Cliente, Usuario } = require('../models');
const sequelize = require('../config/database');

async function testClienteCRUD() {
  try {
    console.log('=== INICIANDO PRUEBAS CRUD DE CLIENTES ===');
    console.log(`Fecha: ${new Date().toLocaleString()}\n`);

    // 1. Crear usuario administrador de prueba
    console.log('1. Creando usuario administrador...');
    const admin = await Usuario.create({
      nombre: 'Admin Test',
      email: 'admin.test@felmart.cl',
      password: 'admin123',
      rol: 'administrador',
      activo: true
    });
    console.log('✅ Usuario administrador creado\n');

    // 2. Crear cliente de prueba
    console.log('2. Creando cliente de prueba...');
    const cliente = await Cliente.create({
      rut: '76.543.210-9',
      nombre_empresa: 'Empresa Test',
      email: 'test@empresa.cl',
      telefono: '+56912345678',
      contacto_principal: 'Juan Test',
      direccion: 'Calle Test 123',
      comuna: 'Santiago',
      ciudad: 'Santiago',
      usuarioId: admin.id
    });
    console.log('✅ Cliente creado\n');

    // 3. Leer cliente
    console.log('3. Leyendo cliente creado...');
    const clienteLeido = await Cliente.findByPk(cliente.id, {
      include: [{ model: Usuario }]
    });
    console.log('✅ Cliente leído:', {
      id: clienteLeido.id,
      rut: clienteLeido.rut,
      nombre_empresa: clienteLeido.nombre_empresa,
      email: clienteLeido.email
    }, '\n');

    // 4. Actualizar cliente
    console.log('4. Actualizando cliente...');
    await clienteLeido.update({
      nombre_empresa: 'Empresa Test Actualizada',
      email: 'test.actualizado@empresa.cl',
      telefono: '+56987654321',
      contacto_principal: 'Juan Test Actualizado',
      direccion: 'Calle Test Actualizada 456'
    });
    console.log('✅ Cliente actualizado\n');

    // 5. Verificar actualización
    console.log('5. Verificando actualización...');
    const clienteActualizado = await Cliente.findByPk(cliente.id);
    console.log('✅ Cliente actualizado:', {
      id: clienteActualizado.id,
      nombre_empresa: clienteActualizado.nombre_empresa,
      email: clienteActualizado.email
    }, '\n');

    // 6. Eliminar cliente
    console.log('6. Eliminando cliente...');
    await clienteActualizado.destroy();
    console.log('✅ Cliente eliminado\n');

    // 7. Verificar eliminación
    console.log('7. Verificando eliminación...');
    const clienteEliminado = await Cliente.findByPk(cliente.id);
    console.log('✅ Cliente eliminado:', clienteEliminado === null ? 'Sí' : 'No', '\n');

    // 8. Limpiar datos de prueba
    console.log('8. Limpiando datos de prueba...');
    await Usuario.destroy({ where: { id: admin.id } });
    console.log('✅ Datos de prueba eliminados\n');

    console.log('=== PRUEBAS CRUD COMPLETADAS EXITOSAMENTE ===');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar pruebas
testClienteCRUD(); 