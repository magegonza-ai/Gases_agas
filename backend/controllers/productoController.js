const Producto = require('../models/Producto');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await Producto.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const p = await Producto.getById(req.params.id);
            if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
            res.json(p);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.nombre || !req.body.unidad_medida) return res.status(400).json({ error: 'Nombre y unidad requeridos' });
            res.status(201).json(await Producto.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    update: async (req, res) => {
        try {
            const p = await Producto.update(req.params.id, req.body);
            if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
            res.json(p);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    delete: async (req, res) => {
        try { res.json(await Producto.delete(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getStockAlertas: async (req, res) => {
        try { res.json(await Producto.getStockAlertas()); } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
