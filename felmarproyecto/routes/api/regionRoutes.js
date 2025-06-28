const express = require('express');
const router = express.Router();
const { Region, Comuna } = require('../../models');

// Obtener todas las regiones
router.get('/', async (req, res) => {
    try {
        const regiones = await Region.findAll({
            order: [['nombre', 'ASC']]
        });
        res.json(regiones);
    } catch (error) {
        console.error('Error al obtener regiones:', error);
        res.status(500).json({ error: 'Error al obtener las regiones' });
    }
});

// Obtener comunas por región
router.get('/:regionId/comunas', async (req, res) => {
    try {
        const { regionId } = req.params;
        const comunas = await Comuna.findAll({
            where: { region_id: regionId },
            order: [['nombre', 'ASC']]
        });
        res.json(comunas);
    } catch (error) {
        console.error('Error al obtener comunas:', error);
        res.status(500).json({ error: 'Error al obtener las comunas' });
    }
});

module.exports = router; 