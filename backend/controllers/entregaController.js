const Entrega = require('../models/Entrega');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await Entrega.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const e = await Entrega.getById(req.params.id);
            if (!e) return res.status(404).json({ error: 'Entrega no encontrada' });
            const detalle = await Entrega.getDetalle(req.params.id);
            res.json({ ...e, detalle });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getParaEntregar: async (req, res) => {
        try { res.json(await Entrega.getParaEntregar(req.params.idCliente)); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.id_cliente || !req.body.id_despachador || !req.body.numero_documento) {
                return res.status(400).json({ error: 'Cliente, despachador y numero de documento requeridos' });
            }
            if (!req.body.detalle || req.body.detalle.length === 0) {
                return res.status(400).json({ error: 'Debe agregar al menos un cilindro' });
            }
            const e = await Entrega.create(req.body, req.body.detalle);
            res.status(201).json(e);
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
