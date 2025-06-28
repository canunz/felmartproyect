const Usuario = require('../models/Usuario');
const Cliente = require('../models/Cliente');
const sequelize = require('../config/database');

const usuariosData = [
  {
    nombre: 'Juan Pérez González',
    email: 'juan.perez@transportesloslagos.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'María González Silva',
    email: 'maria.gonzalez@distribuidorasur.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'Carlos Rodríguez López',
    email: 'carlos.rodriguez@logisticaaustral.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'Ana Torres Muñoz',
    email: 'ana.torres@comercialtemuco.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'Luis Fernández Castro',
    email: 'luis.fernandez@exportacionesbiobio.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'Carmen Soto Díaz',
    email: 'carmen.soto@agropecuariavaldivia.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'Roberto Morales Vera',
    email: 'roberto.morales@maderasosorno.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'Patricia Herrera Ramos',
    email: 'patricia.herrera@alimentoschillan.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'Miguel Vargas Contreras',
    email: 'miguel.vargas@pesqueraspuertomontt.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  },
  {
    nombre: 'Sofía Ruiz Mendoza',
    email: 'sofia.ruiz@turisticapucon.cl',
    password: 'cliente123',
    rol: 'cliente',
    activo: true
  }
];

const clientesData = [
  {
    rut: '76.123.456-7',
    nombre_empresa: 'Transportes Los Lagos Ltda.',
    telefono: '+56912345001',
    contacto_principal: 'Juan Pérez González',
    direccion: 'Av. Angelmó 1250, Puerto Montt',
    comuna_id: 1, // Puerto Montt
    region_id: 12, // Los Lagos
    costo_operativo_km: 150.00,
    costo_operativo_otros: 50.00
  },
  {
    rut: '76.234.567-8',
    nombre_empresa: 'Distribuidora Sur SpA',
    telefono: '+56912345002',
    contacto_principal: 'María González Silva',
    direccion: 'Calle Esmeralda 567, Valdivia',
    comuna_id: 31, // Valdivia
    region_id: 11, // Los Ríos
    costo_operativo_km: 160.00,
    costo_operativo_otros: 60.00
  },
  {
    rut: '76.345.678-9',
    nombre_empresa: 'Logística Austral S.A.',
    telefono: '+56912345003',
    contacto_principal: 'Carlos Rodríguez López',
    direccion: 'Ruta 5 Sur Km 789, Osorno',
    comuna_id: 20, // Osorno
    region_id: 12, // Los Lagos
    costo_operativo_km: 170.00,
    costo_operativo_otros: 70.00
  },
  {
    rut: '76.456.789-0',
    nombre_empresa: 'Comercial Temuco Ltda.',
    telefono: '+56912345004',
    contacto_principal: 'Ana Torres Muñoz',
    direccion: 'Av. Alemania 321, Temuco',
    comuna_id: 43, // Temuco
    region_id: 10, // La Araucanía
    costo_operativo_km: 180.00,
    costo_operativo_otros: 80.00
  },
  {
    rut: '76.567.890-1',
    nombre_empresa: 'Exportaciones Biobío S.A.',
    telefono: '+56912345005',
    contacto_principal: 'Luis Fernández Castro',
    direccion: 'Av. Colón 654, Concepción',
    comuna_id: 75, // Concepción
    region_id: 8, // Biobío
    costo_operativo_km: 190.00,
    costo_operativo_otros: 90.00
  },
  {
    rut: '76.678.901-2',
    nombre_empresa: 'Agropecuaria Valdivia Ltda.',
    telefono: '+56912345006',
    contacto_principal: 'Carmen Soto Díaz',
    direccion: 'Camino a Niebla Km 15, Valdivia',
    comuna_id: 31, // Valdivia
    region_id: 11, // Los Ríos
    costo_operativo_km: 200.00,
    costo_operativo_otros: 100.00
  },
  {
    rut: '76.789.012-3',
    nombre_empresa: 'Maderas Osorno SpA',
    telefono: '+56912345007',
    contacto_principal: 'Roberto Morales Vera',
    direccion: 'Av. Zenteno 147, Osorno',
    comuna_id: 20, // Osorno
    region_id: 12, // Los Lagos
    costo_operativo_km: 210.00,
    costo_operativo_otros: 110.00
  },
  {
    rut: '76.890.123-4',
    nombre_empresa: 'Alimentos Chillán S.A.',
    telefono: '+56912345008',
    contacto_principal: 'Patricia Herrera Ramos',
    direccion: 'Av. Brasil 258, Chillán',
    comuna_id: 108, // Chillán
    region_id: 8, // Biobío
    costo_operativo_km: 220.00,
    costo_operativo_otros: 120.00
  },
  {
    rut: '76.901.234-5',
    nombre_empresa: 'Pesqueras Puerto Montt Ltda.',
    telefono: '+56912345009',
    contacto_principal: 'Miguel Vargas Contreras',
    direccion: 'Costanera 369, Puerto Montt',
    comuna_id: 1, // Puerto Montt
    region_id: 12, // Los Lagos
    costo_operativo_km: 230.00,
    costo_operativo_otros: 130.00
  },
  {
    rut: '76.012.345-6',
    nombre_empresa: 'Turística Pucón SpA',
    telefono: '+56912345010',
    contacto_principal: 'Sofía Ruiz Mendoza',
    direccion: 'Av. Bernardo O\'Higgins 741, Pucón',
    comuna_id: 57, // Pucón
    region_id: 10, // La Araucanía
    costo_operativo_km: 240.00,
    costo_operativo_otros: 140.00
  }
];

async function createClientesAndUsers() {
  try {
    // Sincronizar modelos con la base de datos
    await sequelize.sync();

    console.log('=== CREANDO USUARIOS Y CLIENTES ===');
    console.log(`Fecha: ${new Date().toLocaleString()}`);

    // Crear usuarios y clientes
    for (let i = 0; i < usuariosData.length; i++) {
      try {
        // Crear usuario
        const usuario = await Usuario.create(usuariosData[i]);
        console.log(`✅ Usuario creado: ${usuario.nombre} (${usuario.email})`);

        // Crear cliente asociado al usuario
        const clienteData = {
          ...clientesData[i],
          usuario_id: usuario.id
        };

        const cliente = await Cliente.create(clienteData);
        console.log(`✅ Cliente creado: ${cliente.nombre_empresa} (RUT: ${cliente.rut})`);
        console.log('---');

      } catch (error) {
        console.error(`❌ Error creando usuario/cliente ${i + 1}:`, error.message);
      }
    }

    console.log('=== PROCESO COMPLETADO ===');
    console.log(`Total usuarios creados: ${usuariosData.length}`);
    console.log(`Total clientes creados: ${clientesData.length}`);

  } catch (error) {
    console.error('Error general al crear usuarios y clientes:', error.message);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

createClientesAndUsers(); 