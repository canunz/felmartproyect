const { Region, Comuna } = require('../models');

// Obtener todas las regiones
exports.getAllRegiones = async (req, res) => {
    try {
        const regiones = await Region.findAll({
            attributes: ['id', 'nombre'],
            order: [['nombre', 'ASC']]
        });
        res.json({
            success: true,
            regiones: regiones
        });
    } catch (error) {
        console.error('Error al obtener regiones:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al obtener regiones',
            error: error.message 
        });
    }
};

// Obtener comunas por región
exports.getComunasByRegion = async (req, res) => {
    try {
        const { regionId } = req.params;
        
        // Validar que regionId sea un número
        if (!regionId || isNaN(regionId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de región inválido'
            });
        }

        // Buscar las comunas
        const comunas = await Comuna.findAll({
            where: { region_id: regionId },
            attributes: ['id', 'nombre'],
            order: [['nombre', 'ASC']]
        });

        res.json({
            success: true,
            comunas: comunas
        });
    } catch (error) {
        console.error('Error al obtener comunas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las comunas',
            error: error.message
        });
    }
};

exports.listarRegiones = async (req, res) => {
  try {
    const regiones = await Region.findAll({ attributes: ['id', 'nombre'] });
    res.json({ success: true, regiones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cargar regiones' });
  }
}; 