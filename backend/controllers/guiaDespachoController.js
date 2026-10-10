const GuiaDespacho = require('../models/GuiaDespacho');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await GuiaDespacho.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const g = await GuiaDespacho.getById(req.params.id);
            if (!g) return res.status(404).json({ error: 'Guía de despacho no encontrada' });
            res.json(g);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getByDetalleRecepcion: async (req, res) => {
        try { res.json(await GuiaDespacho.getByDetalleRecepcion(req.params.idDetalle)); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.id_detalle_recepcion || !req.body.id_planta_externa || !req.body.numero_guia) {
                return res.status(400).json({ error: 'Detalle recepción, planta y número de guía requeridos' });
            }
            res.status(201).json(await GuiaDespacho.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    update: async (req, res) => {
        try {
            const g = await GuiaDespacho.update(req.params.id, req.body);
            if (!g) return res.status(404).json({ error: 'Guía de despacho no encontrada' });
            res.json(g);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    recibirEnPlanta: async (req, res) => {
        try {
            const g = await GuiaDespacho.recibirEnPlanta(req.params.id);
            if (!g) return res.status(404).json({ error: 'Guía de despacho no encontrada' });
            res.json(g);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    retornarDePlanta: async (req, res) => {
        try {
            const g = await GuiaDespacho.retornarDePlanta(req.params.id);
            if (!g) return res.status(404).json({ error: 'Guía de despacho no encontrada' });
            res.json(g);
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;