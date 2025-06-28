const PrecioResiduo = require('../models/PrecioResiduo');
const sequelize = require('../config/database');

const preciosIniciales = [
    {
      "id": 1,
      "descripcion": "ACEITE",
      "precio": 1.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 2,
      "descripcion": "ACEITE CON TRAZAS DE AGUA",
      "precio": 6.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 3,
      "descripcion": "AGUAS CEMENTICIAS",
      "precio": 9.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 4,
      "descripcion": "AGUAS CONTAMINADAS CON DETERGENTE",
      "precio": 9.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 5,
      "descripcion": "AGUAS SENTINAS",
      "precio": 9.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 6,
      "descripcion": "PAÑOS CONTAMINADOS CON HC",
      "precio": 6.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 7,
      "descripcion": "PAÑOS CONTAMINADOS CON HC (TAMBOR)",
      "precio": 55000.00,
      "unidad": "TAMBOR",
      "moneda": "CLP",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 8,
      "descripcion": "BORRA DE PINTURAS",
      "precio": 9.60,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 9,
      "descripcion": "BORRA DE PINTURAS (TAMBOR)",
      "precio": 57000.00,
      "unidad": "TAMBOR",
      "moneda": "CLP",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 10,
      "descripcion": "CARCASAS DE BATERÍAS",
      "precio": 7.50,
      "unidad": "UNIDAD",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 11,
      "descripcion": "CATALIZADORES",
      "precio": 4.00,
      "unidad": "UNIDAD",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 12,
      "descripcion": "EMPAQUES CON TINTAS",
      "precio": 8.80,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 13,
      "descripcion": "ENVASES PLÁSTICOS CON HC",
      "precio": 7.80,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 14,
      "descripcion": "FILTROS DE ACEITE",
      "precio": 7.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 15,
      "descripcion": "FILTROS DE AIRE",
      "precio": 6.80,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 16,
      "descripcion": "LUBRICANTES USADOS",
      "precio": 1.20,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 17,
      "descripcion": "METALES CON HC",
      "precio": 10.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 18,
      "descripcion": "RESIDUOS SÓLIDOS CON HC",
      "precio": 11.00,
      "unidad": "IBC",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 19,
      "descripcion": "TIERRA CONTAMINADA",
      "precio": 12.50,
      "unidad": "TONELADA",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    },
    {
      "id": 20,
      "descripcion": "TAMBORES CON RESIDUOS PELIGROSOS",
      "precio": 4.00,
      "unidad": "UNIDAD",
      "moneda": "UF",
      "created_at": "2025-06-12T00:00:00Z",
      "updated_at": "2025-06-12T00:00:00Z"
    }
  
];

async function cargarPrecios() {
  try {
    // Sincronizar el modelo con la base de datos
    await sequelize.sync();

    // Cargar cada precio
    for (const precio of preciosIniciales) {
      await PrecioResiduo.create(precio);
      console.log(`Precio cargado: ${precio.descripcion}`);
    }

    console.log('Todos los precios han sido cargados exitosamente');
  } catch (error) {
    console.error('Error al cargar los precios:', error);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Ejecutar la función de carga
cargarPrecios(); 