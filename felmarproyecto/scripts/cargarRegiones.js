const Region = require('../models/Region');
const sequelize = require('../config/database');

const regiones = [
  {
    "id": 8,
    "nombre": "Región del Biobío",
  },
  {
    "id": 10,
    "nombre": "Región de La Araucanía",
  },
  {
    "id": 11,
    "nombre": "Región de Los Ríos",
  },
  {
    "id": 12,
    "nombre": "Región de Los Lagos",
  },
  {
    "id": 13,
    "nombre": "Región de Aysén del General Carlos Ibáñez del Campo",
  },
  {
    "id": 14,
    "nombre": "Región de Magallanes y de la Antártica Chilena",
  }
];

async function cargarRegiones() {
  try {
    // Sincronizar el modelo con la base de datos
    await sequelize.sync();

    for (const region of regiones) {
      await Region.create(region);
      console.log(`Region cargada: ${region.nombre}`);
    }

    console.log('Todos las regiones han sido cargados exitosamente');
  } catch (error) {
    console.error('Error al cargar las regiones:', error);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

cargarRegiones() 