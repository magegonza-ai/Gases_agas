const CertificadoBaja = require('../models/CertificadoBaja');

const controller = {
    getAll: async (req, res) => {
        try { res.json(await CertificadoBaja.getAll()); } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getById: async (req, res) => {
        try {
            const c = await CertificadoBaja.getById(req.params.id);
            if (!c) return res.status(404).json({ error: 'Certificado de baja no encontrado' });
            res.json(c);
        } catch (e) { res.status(500).json({ error: e.message }); }
    },
    getByEnvase: async (req, res) => {
        try { res.json(await CertificadoBaja.getByEnvase(req.params.idEnvase)); } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = controller;
