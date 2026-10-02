const Cliente = require('../models/Cliente');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await Cliente.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const c = await Cliente.getById(req.params.id);
            if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
            res.json(c);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.razon_social || !req.body.rut) return res.status(400).json({ error: 'Razon social y RUT requeridos' });
            res.status(201).json(await Cliente.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    update: async (req, res) => {
        try {
            const c = await Cliente.update(req.params.id, req.body);
            if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
            res.json(c);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    delete: async (req, res) => {
        try { res.json(await Cliente.delete(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    search: async (req, res) => {
        try { res.json(await Cliente.search(req.params.term)); } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
