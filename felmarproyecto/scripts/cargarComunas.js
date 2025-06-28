const Comuna = require('../models/Comuna');
const sequelize = require('../config/database');

const comunas = [
  // Región de Los Lagos (12)
  { "id": 1, "nombre": "Puerto Montt", "region_id": 12 },
  { "id": 2, "nombre": "Calbuco", "region_id": 12 },
  { "id": 3, "nombre": "Cochamó", "region_id": 12 },
  { "id": 4, "nombre": "Fresia", "region_id": 12 },
  { "id": 5, "nombre": "Frutillar", "region_id": 12 },
  { "id": 6, "nombre": "Los Muermos", "region_id": 12 },
  { "id": 7, "nombre": "Llanquihue", "region_id": 12 },
  { "id": 8, "nombre": "Maullín", "region_id": 12 },
  { "id": 9, "nombre": "Puerto Varas", "region_id": 12 },
  { "id": 10, "nombre": "Castro", "region_id": 12 },
  { "id": 11, "nombre": "Ancud", "region_id": 12 },
  { "id": 12, "nombre": "Chonchi", "region_id": 12 },
  { "id": 13, "nombre": "Curaco de Vélez", "region_id": 12 },
  { "id": 14, "nombre": "Dalcahue", "region_id": 12 },
  { "id": 15, "nombre": "Puqueldón", "region_id": 12 },
  { "id": 16, "nombre": "Queilén", "region_id": 12 },
  { "id": 17, "nombre": "Quellón", "region_id": 12 },
  { "id": 18, "nombre": "Quemchi", "region_id": 12 },
  { "id": 19, "nombre": "Quinchao", "region_id": 12 },
  { "id": 20, "nombre": "Osorno", "region_id": 12 },
  { "id": 21, "nombre": "Puerto Octay", "region_id": 12 },
  { "id": 22, "nombre": "Purranque", "region_id": 12 },
  { "id": 23, "nombre": "Puyehue", "region_id": 12 },
  { "id": 24, "nombre": "Río Negro", "region_id": 12 },
  { "id": 25, "nombre": "San Juan de la Costa", "region_id": 12 },
  { "id": 26, "nombre": "San Pablo", "region_id": 12 },
  { "id": 27, "nombre": "Chaitén", "region_id": 12 },
  { "id": 28, "nombre": "Futaleufú", "region_id": 12 },
  { "id": 29, "nombre": "Hualaihue", "region_id": 12 },
  { "id": 30, "nombre": "Palena", "region_id": 12 },

  // Región de Los Ríos (11)
  { "id": 31, "nombre": "Valdivia", "region_id": 11 },
  { "id": 32, "nombre": "Corral", "region_id": 11 },
  { "id": 33, "nombre": "Lanco", "region_id": 11 },
  { "id": 34, "nombre": "Los Lagos", "region_id": 11 },
  { "id": 35, "nombre": "Máfil", "region_id": 11 },
  { "id": 36, "nombre": "Mariquina", "region_id": 11 },
  { "id": 37, "nombre": "Paillaco", "region_id": 11 },
  { "id": 38, "nombre": "Panguipulli", "region_id": 11 },
  { "id": 39, "nombre": "La Unión", "region_id": 11 },
  { "id": 40, "nombre": "Futrono", "region_id": 11 },
  { "id": 41, "nombre": "Lago Ranco", "region_id": 11 },
  { "id": 42, "nombre": "Río Bueno", "region_id": 11 },

  // Región de La Araucanía (10)
  { "id": 43, "nombre": "Temuco", "region_id": 10 },
  { "id": 44, "nombre": "Carahue", "region_id": 10 },
  { "id": 45, "nombre": "Cunco", "region_id": 10 },
  { "id": 46, "nombre": "Curarrehue", "region_id": 10 },
  { "id": 47, "nombre": "Freire", "region_id": 10 },
  { "id": 48, "nombre": "Galvarino", "region_id": 10 },
  { "id": 49, "nombre": "Gorbea", "region_id": 10 },
  { "id": 50, "nombre": "Lautaro", "region_id": 10 },
  { "id": 51, "nombre": "Loncoche", "region_id": 10 },
  { "id": 52, "nombre": "Melipeuco", "region_id": 10 },
  { "id": 53, "nombre": "Nueva Imperial", "region_id": 10 },
  { "id": 54, "nombre": "Padre Las Casas", "region_id": 10 },
  { "id": 55, "nombre": "Perquenco", "region_id": 10 },
  { "id": 56, "nombre": "Pitrufquén", "region_id": 10 },
  { "id": 57, "nombre": "Pucón", "region_id": 10 },
  { "id": 58, "nombre": "Saavedra", "region_id": 10 },
  { "id": 59, "nombre": "Teodoro Schmidt", "region_id": 10 },
  { "id": 60, "nombre": "Toltén", "region_id": 10 },
  { "id": 61, "nombre": "Vilcún", "region_id": 10 },
  { "id": 62, "nombre": "Villarrica", "region_id": 10 },
  { "id": 63, "nombre": "Cholchol", "region_id": 10 },
  { "id": 64, "nombre": "Angol", "region_id": 10 },
  { "id": 65, "nombre": "Collipulli", "region_id": 10 },
  { "id": 66, "nombre": "Curacautín", "region_id": 10 },
  { "id": 67, "nombre": "Ercilla", "region_id": 10 },
  { "id": 68, "nombre": "Lonquimay", "region_id": 10 },
  { "id": 69, "nombre": "Los Sauces", "region_id": 10 },
  { "id": 70, "nombre": "Lumaco", "region_id": 10 },
  { "id": 71, "nombre": "Purén", "region_id": 10 },
  { "id": 72, "nombre": "Renaico", "region_id": 10 },
  { "id": 73, "nombre": "Traiguén", "region_id": 10 },
  { "id": 74, "nombre": "Victoria", "region_id": 10 },

  // Región del Biobío (8)
  { "id": 75, "nombre": "Concepción", "region_id": 8 },
  { "id": 76, "nombre": "Coronel", "region_id": 8 },
  { "id": 77, "nombre": "Chiguayante", "region_id": 8 },
  { "id": 78, "nombre": "Florida", "region_id": 8 },
  { "id": 79, "nombre": "Hualqui", "region_id": 8 },
  { "id": 80, "nombre": "Lota", "region_id": 8 },
  { "id": 81, "nombre": "Penco", "region_id": 8 },
  { "id": 82, "nombre": "San Pedro De La Paz", "region_id": 8 },
  { "id": 83, "nombre": "Santa Juana", "region_id": 8 },
  { "id": 84, "nombre": "Talcahuano", "region_id": 8 },
  { "id": 85, "nombre": "Tomé", "region_id": 8 },
  { "id": 86, "nombre": "Hualpén", "region_id": 8 },
  { "id": 87, "nombre": "Lebu", "region_id": 8 },
  { "id": 88, "nombre": "Arauco", "region_id": 8 },
  { "id": 89, "nombre": "Cañete", "region_id": 8 },
  { "id": 90, "nombre": "Contulmo", "region_id": 8 },
  { "id": 91, "nombre": "Curanilahue", "region_id": 8 },
  { "id": 92, "nombre": "Los Alamos", "region_id": 8 },
  { "id": 93, "nombre": "Tirua", "region_id": 8 },
  { "id": 94, "nombre": "Los Angeles", "region_id": 8 },
  { "id": 95, "nombre": "Antuco", "region_id": 8 },
  { "id": 96, "nombre": "Cabrero", "region_id": 8 },
  { "id": 97, "nombre": "Laja", "region_id": 8 },
  { "id": 98, "nombre": "Mulchén", "region_id": 8 },
  { "id": 99, "nombre": "Nacimiento", "region_id": 8 },
  { "id": 100, "nombre": "Negrete", "region_id": 8 },
  { "id": 101, "nombre": "Quilaco", "region_id": 8 },
  { "id": 102, "nombre": "Quilleco", "region_id": 8 },
  { "id": 103, "nombre": "San Rosendo", "region_id": 8 },
  { "id": 104, "nombre": "Santa Bárbara", "region_id": 8 },
  { "id": 105, "nombre": "Tucapel", "region_id": 8 },
  { "id": 106, "nombre": "Yumbel", "region_id": 8 },
  { "id": 107, "nombre": "Alto Biobío", "region_id": 8 },
  { "id": 108, "nombre": "Chillán", "region_id": 8 },
  { "id": 109, "nombre": "Bulnes", "region_id": 8 },
  { "id": 110, "nombre": "Cobquecura", "region_id": 8 },
  { "id": 111, "nombre": "Coelemu", "region_id": 8 },
  { "id": 112, "nombre": "Coihueco", "region_id": 8 },
  { "id": 113, "nombre": "Chillán Viejo", "region_id": 8 },
  { "id": 114, "nombre": "El Carmen", "region_id": 8 },
  { "id": 115, "nombre": "Ninhue", "region_id": 8 },
  { "id": 116, "nombre": "Ñiquén", "region_id": 8 },
  { "id": 117, "nombre": "Pemuco", "region_id": 8 },
  { "id": 118, "nombre": "Pinto", "region_id": 8 },
  { "id": 119, "nombre": "Portezuelo", "region_id": 8 },
  { "id": 120, "nombre": "Quillón", "region_id": 8 },
  { "id": 121, "nombre": "Quirihue", "region_id": 8 },
  { "id": 122, "nombre": "Ranquil", "region_id": 8 },
  { "id": 123, "nombre": "San Carlos", "region_id": 8 },
  { "id": 124, "nombre": "San Fabián", "region_id": 8 },
  { "id": 125, "nombre": "San Ignacio", "region_id": 8 },
  { "id": 126, "nombre": "San Nicolás", "region_id": 8 },
  { "id": 127, "nombre": "Trehuaco", "region_id": 8 },
  { "id": 128, "nombre": "Yungay", "region_id": 8 }
];

async function cargarComunas() {
  try {
    // Sincronizar el modelo con la base de datos
    await sequelize.sync();

    for (const comuna of comunas) {
      await Comuna.create(comuna);
      console.log(`Comuna cargada: ${comuna.nombre} (Región ${comuna.region_id})`);
    }

    console.log('Todas las comunas han sido cargadas exitosamente');
    console.log(`Total de comunas cargadas: ${comunas.length}`);
  } catch (error) {
    console.error('Error al cargar las comunas:', error);
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

cargarComunas(); 