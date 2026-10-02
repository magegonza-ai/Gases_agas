const Transaccion = require('../models/Transaccion');

const transaccionController = {
    getAll: async (req, res) => {
        try {
            const transacciones = await Transaccion.getAll();
            res.json(transacciones);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getById: async (req, res) => {
        try {
            const transaccion = await Transaccion.getById(req.params.id);
            if (!transaccion) return res.status(404).json({ error: 'Transacción no encontrada' });
            const detalle = await Transaccion.getDetalle(req.params.id);
            res.json({ ...transaccion, detalle });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    create: async (req, res) => {
        try {
            const { id_cliente, numero_documento, detalle } = req.body;
            if (!id_cliente || !numero_documento) {
                return res.status(400).json({ error: 'Cliente y número de documento son requeridos' });
            }
            const transaccion = await Transaccion.create(req.body, detalle);
            res.status(201).json(transaccion);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const transaccion = await Transaccion.update(req.params.id, req.body);
            if (!transaccion) return res.status(404).json({ error: 'Transacción no encontrada' });
            res.json(transaccion);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    anular: async (req, res) => {
        try {
            const transaccion = await Transaccion.anular(req.params.id);
            if (!transaccion) return res.status(404).json({ error: 'Transacción no encontrada' });
            res.json(transaccion);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getByFecha: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const transacciones = await Transaccion.getByFecha(fechaInicio, fechaFin);
            res.json(transacciones);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getByCliente: async (req, res) => {
        try {
            const transacciones = await Transaccion.getByCliente(req.params.idCliente);
            res.json(transacciones);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getResumenDiario: async (req, res) => {
        try {
            const resumen = await Transaccion.getResumenDiario();
            res.json(resumen);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = transaccionController;
