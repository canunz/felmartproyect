const Cotizacion = require('../models/Cotizacion');
const CotizacionResiduo = require('../models/CotizacionResiduo');
const sequelize = require('../config/database');

const cotizacionesIniciales = [
  {
    numeroCotizacion: "COT-2024-001",
    fecha: new Date(),
    nombre: "Juan Pérez",
    rut: "12345678-9",
    correo: "juan.perez@ejemplo.com",
    telefono: "+56912345678",
    direccion: "Calle Principal 123",
    region_id: 12,
    comuna_id: 1,
    nombreEmpresa: "Empresa ABC",
    rutEmpresa: "76543210-1",
    subtotal: 0,
    iva: 0,
    total: 0,
    estado: "pendiente",
    observaciones: "Cotización de prueba",
    detalles: "Detalles adicionales de la cotización"
  },
  {
    numeroCotizacion: "COT-2024-002",
    fecha: new Date(),
    nombre: "María González",
    rut: "98765432-1",
    correo: "maria.gonzalez@ejemplo.com",
    telefono: "+56987654321",
    direccion: "Avenida Central 456",
    region_id: 11,
    comuna_id: 31,
    nombreEmpresa: "Empresa XYZ",
    rutEmpresa: "11223344-5",
    subtotal: 0,
    iva: 0,
    total: 0,
    estado: "pendiente",
    observaciones: "Segunda cotización de prueba",
    detalles: "Más detalles de la cotización"
  }
];

const cotizacionesResiduosIniciales = [
  {
    cotizacion_id: "COT-2024-001",
    precio_residuo_id: 1,
    descripcion: "ACEITE",
    precio_unitario: 1.00,
    cantidad: 2,
    subtotal: 2.00
  },
  {
    cotizacion_id: "COT-2024-001",
    precio_residuo_id: 2,
    descripcion: "ACEITE CON TRAZAS DE AGUA",
    precio_unitario: 6.00,
    cantidad: 1,
    subtotal: 6.00
  },
  {
    cotizacion_id: "COT-2024-002",
    precio_residuo_id: 3,
    descripcion: "AGUAS CEMENTICIAS",
    precio_unitario: 9.00,
    cantidad: 3,
    subtotal: 27.00
  },
  {
    cotizacion_id: "COT-2024-002",
    precio_residuo_id: 4,
    descripcion: "AGUAS CONTAMINADAS CON DETERGENTE",
    precio_unitario: 9.00,
    cantidad: 2,
    subtotal: 18.00
  }
];

async function cargarCotizaciones() {
  try {
    // Sincronizar los modelos con la base de datos
    await sequelize.sync();

    // Cargar cotizaciones
    for (const cotizacion of cotizacionesIniciales) {
      await Cotizacion.create(cotizacion);
      console.log(`Cotización cargada: ${cotizacion.numeroCotizacion}`);
    }

    // Cargar cotizaciones_residuos
    for (const cotizacionResiduo of cotizacionesResiduosIniciales) {
      await CotizacionResiduo.create(cotizacionResiduo);
      console.log(`Cotización residuo cargada para: ${cotizacionResiduo.cotizacion_id}`);
    }

    // Actualizar totales de las cotizaciones
    for (const cotizacion of cotizacionesIniciales) {
      const residuos = await CotizacionResiduo.findAll({
        where: { cotizacion_id: cotizacion.numeroCotizacion }
      });

      const subtotal = residuos.reduce((sum, residuo) => sum + parseFloat(residuo.subtotal), 0);
      const iva = subtotal * 0.19;
      const total = subtotal + iva;

      await Cotizacion.update(
        {
          subtotal: subtotal,
          iva: iva,
          total: total
        },
        {
          where: { numeroCotizacion: cotizacion.numeroCotizacion }
        }
      );

      console.log(`Totales actualizados para cotización: ${cotizacion.numeroCotizacion}`);
    }

    console.log('Todas las cotizaciones y residuos han sido cargados exitosamente');
  } catch (error) {
    console.error('Error al cargar las cotizaciones:', error);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Ejecutar la función de carga
cargarCotizaciones(); 