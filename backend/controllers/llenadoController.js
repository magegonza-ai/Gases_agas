const Llenado = require('../models/Llenado');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await Llenado.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getPendientes: async (req, res) => {
        try { res.json(await Llenado.getPendientesLlenado()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getEnTransito: async (req, res) => {
        try { res.json(await Llenado.getEnTransito()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getHistorial: async (req, res) => {
        try { res.json(await Llenado.getHistorial()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            // La cantidad NO se pide aquí: proviene del comprobante de recepción (detalle)
            if (!req.body.id_detalle_recepcion || !req.body.id_envase || !req.body.id_llenador || !req.body.gas_llenado) {
                return res.status(400).json({ error: 'Detalle de recepción, envase, llenador y gas requeridos' });
            }
            res.status(201).json(await Llenado.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;