const sequelize = require('../config/database');

async function addClienteIdColumn() {
  try {
    // Agregar la columna cliente_id
    await sequelize.query(`
      ALTER TABLE visitas_retiro 
      ADD COLUMN cliente_id VARCHAR(255) NOT NULL;
    `);

    // Agregar la foreign key
    await sequelize.query(`
      ALTER TABLE visitas_retiro 
      ADD CONSTRAINT visitas_retiro_cliente_id_fkey 
      FOREIGN KEY (cliente_id) 
      REFERENCES clientes(rut) 
      ON UPDATE CASCADE 
      ON DELETE RESTRICT;
    `);

    console.log('Columna cliente_id agregada exitosamente');
  } catch (error) {
    console.error('Error al agregar la columna:', error);
  } finally {
    await sequelize.close();
  }
}

addClienteIdColumn(); 