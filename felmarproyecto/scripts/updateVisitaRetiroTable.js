const sequelize = require('../config/database');

async function updateVisitaRetiroTable() {
  try {
    console.log('Iniciando actualización de la tabla visitas_retiro...');

    // Agregar columna respuesta_cliente
    await sequelize.query(`
      ALTER TABLE visitas_retiro 
      ADD COLUMN respuesta_cliente ENUM('pendiente', 'aceptada', 'rechazada') 
      DEFAULT 'pendiente' AFTER estado
    `);
    console.log('✓ Columna respuesta_cliente agregada');

    // Agregar columna motivo_rechazo
    await sequelize.query(`
      ALTER TABLE visitas_retiro 
      ADD COLUMN motivo_rechazo TEXT NULL AFTER respuesta_cliente
    `);
    console.log('✓ Columna motivo_rechazo agregada');

    // Agregar columna fecha_respuesta_cliente
    await sequelize.query(`
      ALTER TABLE visitas_retiro 
      ADD COLUMN fecha_respuesta_cliente DATETIME NULL AFTER motivo_rechazo
    `);
    console.log('✓ Columna fecha_respuesta_cliente agregada');

    console.log('✅ Actualización de la tabla visitas_retiro completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error al actualizar la tabla visitas_retiro:', error.message);
    
    // Si las columnas ya existen, no es un error crítico
    if (error.message.includes('Duplicate column name')) {
      console.log('ℹ️  Algunas columnas ya existen, continuando...');
    } else {
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

// Ejecutar el script
updateVisitaRetiroTable()
  .then(() => {
    console.log('🎉 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error en el script:', error);
    process.exit(1);
  }); 