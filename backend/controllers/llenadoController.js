const Llenado = require('../models/Llenado');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await Llenado.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getPendientes: async (req, res) => {
        try { res.json(await Llenado.getPendientesLlenado()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    create: async (req, res) => {
        try {
            if (!req.body.id_envase || !req.body.id_llenador || !req.body.gas_llenado || !req.body.cantidad) {
                return res.status(400).json({ error: 'Envase, llenador, gas y cantidad requeridos' });
            }
            res.status(201).json(await Llenado.create(req.body));
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
