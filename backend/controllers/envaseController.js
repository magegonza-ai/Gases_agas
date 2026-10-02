const Envase = require('../models/Envase');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await Envase.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const e = await Envase.getById(req.params.id);
            if (!e) return res.status(404).json({ error: 'Envase no encontrado' });
            res.json(e);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getByCodigo: async (req, res) => {
        try {
            const e = await Envase.getByCodigo(req.params.codigo);
            if (!e) return res.status(404).json({ error: 'Envase no encontrado' });
            res.json(e);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.codigo_interno || !req.body.id_producto) return res.status(400).json({ error: 'Codigo y producto requeridos' });
            res.status(201).json(await Envase.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    update: async (req, res) => {
        try {
            const e = await Envase.update(req.params.id, req.body);
            if (!e) return res.status(404).json({ error: 'Envase no encontrado' });
            res.json(e);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    updateEstado: async (req, res) => {
        try {
            const e = await Envase.updateEstado(req.params.id, req.body.estado);
            if (!e) return res.status(404).json({ error: 'Envase no encontrado' });
            res.json(e);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    delete: async (req, res) => {
        try { res.json(await Envase.delete(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getResumen: async (req, res) => {
        try { res.json(await Envase.getResumen()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getObservaciones: async (req, res) => {
        try { res.json(await Envase.getObservaciones(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    addObservacion: async (req, res) => {
        try {
            res.status(201).json(await Envase.addObservacion(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
