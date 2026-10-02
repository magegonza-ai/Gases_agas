const Trabajador = require('../models/Trabajador');
const db = require('../config/database');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await Trabajador.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const t = await Trabajador.getById(req.params.id);
            if (!t) return res.status(404).json({ error: 'Trabajador no encontrado' });
            res.json(t);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getByCargo: async (req, res) => {
        try { res.json(await Trabajador.getByCargo(req.params.cargo)); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getCargos: async (req, res) => {
        try {
            const result = await db.query('SELECT * FROM cargos ORDER BY nombre');
            res.json(result.rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.nombre) return res.status(400).json({ error: 'Nombre requerido' });
            if (!req.body.cargos || req.body.cargos.length === 0) return res.status(400).json({ error: 'Seleccione al menos un cargo' });
            res.status(201).json(await Trabajador.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    update: async (req, res) => {
        try {
            if (!req.body.cargos || req.body.cargos.length === 0) return res.status(400).json({ error: 'Seleccione al menos un cargo' });
            const t = await Trabajador.update(req.params.id, req.body);
            if (!t) return res.status(404).json({ error: 'Trabajador no encontrado' });
            res.json(t);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    delete: async (req, res) => {
        try { res.json(await Trabajador.delete(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
