const sequelize = require('./config/database');

async function addColumns() {
  try {
    // Agregar columna id como primary key
    await sequelize.query(`
      ALTER TABLE visitas_retiro
      ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST;
    `);

    // Hacer solicitud_retiro_id nullable
    await sequelize.query(`
      ALTER TABLE visitas_retiro
      MODIFY COLUMN solicitud_retiro_id INT NULL;
    `);

    // Agregar columnas nuevas
    await sequelize.query(`
      ALTER TABLE visitas_retiro
      ADD COLUMN cliente_id INT NOT NULL,
      ADD COLUMN operador_id INT,
      ADD COLUMN tipo_visita VARCHAR(255) NOT NULL DEFAULT 'retiro',
      ADD COLUMN direccion_visita TEXT,
      ADD COLUMN notas_tecnico TEXT,
      ADD FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      ADD FOREIGN KEY (operador_id) REFERENCES usuarios(id);
    `);

    // Actualizar enum estado
    await sequelize.query(`
      ALTER TABLE visitas_retiro
      MODIFY COLUMN estado ENUM('pendiente', 'programada', 'en_proceso', 'completada', 'cancelada') DEFAULT 'pendiente';
    `);

    // Actualizar valores por defecto
    await sequelize.query(`
      ALTER TABLE visitas_retiro
      MODIFY COLUMN hora_fin TIME NULL;
    `);

    console.log('✅ Columnas agregadas correctamente');
  } catch (error) {
    console.error('❌ Error al agregar columnas:', error);
    throw error;
  }
}

async function modifyClienteIdColumn() {
  try {
    // Modificar el tipo de la columna cliente_id a VARCHAR
    await sequelize.query(`
      ALTER TABLE visitas_retiro 
      ALTER COLUMN cliente_id TYPE VARCHAR(255);
    `);

    // Actualizar la foreign key
    await sequelize.query(`
      ALTER TABLE visitas_retiro 
      DROP CONSTRAINT IF EXISTS visitas_retiro_cliente_id_fkey;
    `);

    await sequelize.query(`
      ALTER TABLE visitas_retiro 
      ADD CONSTRAINT visitas_retiro_cliente_id_fkey 
      FOREIGN KEY (cliente_id) 
      REFERENCES clientes(rut) 
      ON UPDATE CASCADE 
      ON DELETE RESTRICT;
    `);

    console.log('Columna cliente_id modificada exitosamente');
  } catch (error) {
    console.error('Error al modificar la columna:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar la migración
addColumns()
  .then(() => {
    console.log('✅ Migración completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  });

modifyClienteIdColumn();