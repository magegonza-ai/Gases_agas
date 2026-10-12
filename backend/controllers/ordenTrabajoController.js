const OrdenTrabajo = require('../models/OrdenTrabajo');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await OrdenTrabajo.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const ot = await OrdenTrabajo.getById(req.params.id);
            if (!ot) return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
            res.json(ot);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getPending: async (req, res) => {
        try { res.json(await OrdenTrabajo.getPending()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.id_envase || !req.body.tipo_trabajo) {
                return res.status(400).json({ error: 'Envase y tipo de trabajo requeridos' });
            }
            res.status(201).json(await OrdenTrabajo.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    start: async (req, res) => {
        try {
            const ot = await OrdenTrabajo.start(req.params.id, req.body.id_asignado);
            if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });
            res.json(ot);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    complete: async (req, res) => {
        try {
            const ot = await OrdenTrabajo.complete(req.params.id, req.body);
            if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });
            res.json(ot);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    registroAvance: async (req, res) => {
        try {
            if (!req.body.detalle) {
                return res.status(400).json({ error: 'Debe indicar el detalle del avance' });
            }
            const ot = await OrdenTrabajo.registrarAvance(req.params.id, req.body.detalle);
            if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });
            res.json(ot);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    cancel: async (req, res) => {
        try {
            const ot = await OrdenTrabajo.cancel(req.params.id);
            if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });
            res.json(ot);
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
