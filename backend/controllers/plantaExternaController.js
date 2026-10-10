const PlantaExterna = require('../models/PlantaExterna');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await PlantaExterna.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getAllIncluyendoInactivas: async (req, res) => {
        try { res.json(await PlantaExterna.getAllIncluyendoInactivas()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const p = await PlantaExterna.getById(req.params.id);
            if (!p) return res.status(404).json({ error: 'Planta externa no encontrada' });
            res.json(p);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.rut || !req.body.razon_social) return res.status(400).json({ error: 'RUT y Razón Social requeridos' });
            res.status(201).json(await PlantaExterna.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    update: async (req, res) => {
        try {
            const p = await PlantaExterna.update(req.params.id, req.body);
            if (!p) return res.status(404).json({ error: 'Planta externa no encontrada' });
            res.json(p);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    delete: async (req, res) => {
        try { res.json(await PlantaExterna.delete(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;