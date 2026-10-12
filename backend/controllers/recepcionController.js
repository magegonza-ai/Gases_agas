const Recepcion = require('../models/Recepcion');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await Recepcion.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const r = await Recepcion.getById(req.params.id);
            if (!r) return res.status(404).json({ error: 'Recepcion no encontrada' });
            const detalle = await Recepcion.getDetalle(req.params.id);
            res.json({ ...r, detalle });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.id_cliente || !req.body.id_recepcionista) {
                return res.status(400).json({ error: 'Cliente y recepcionista requeridos' });
            }
            if (!req.body.detalle || req.body.detalle.length === 0) {
                return res.status(400).json({ error: 'Debe agregar al menos un cilindro' });
            }
            const r = await Recepcion.create(req.body, req.body.detalle);
            res.status(201).json(r);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    // Próximo número de comprobante (secuencial del día) para mostrar en el formulario
    siguiente: async (req, res) => {
        try {
            res.json({ numero_comprobante: Recepcion.siguienteComprobante() });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    close: async (req, res) => {
        try {
            const r = await Recepcion.close(req.params.id);
            if (!r) return res.status(404).json({ error: 'Recepcion no encontrada' });
            res.json(r);
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
