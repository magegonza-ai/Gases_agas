const db = require('../config/database');

const Envase = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM vw_envases_completo ORDER BY codigo_interno');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query(`
            SELECT e.*, p.nombre as gas, c.razon_social as propietario_nombre
            FROM envases e
            JOIN productos p ON e.id_producto = p.id_producto
            LEFT JOIN clientes c ON e.id_propietario = c.id_cliente
            WHERE e.id_envase = $1
        `, [id]);
        return result.rows[0];
    },
    getByCodigo: async (codigo) => {
        const result = await db.query(`
            SELECT e.*, p.nombre as gas, c.razon_social as propietario_nombre
            FROM envases e
            JOIN productos p ON e.id_producto = p.id_producto
            LEFT JOIN clientes c ON e.id_propietario = c.id_cliente
            WHERE e.codigo_interno = $1
        `, [codigo]);
        return result.rows[0];
    },
    create: async (data) => {
        const { codigo_interno, id_producto, capacidad, propiedad, id_propietario, estado, observaciones_generales } = data;
        const result = await db.query(
            `INSERT INTO envases (codigo_interno, id_producto, capacidad, propiedad, id_propietario, estado, observaciones_generales)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [codigo_interno, id_producto, capacidad, propiedad, id_propietario || null, estado || 'Disponible', observaciones_generales]
        );
        return result.rows[0];
    },
    update: async (id, data) => {
        const { codigo_interno, id_producto, capacidad, propiedad, id_propietario, estado, observaciones_generales } = data;
        const result = await db.query(
            `UPDATE envases SET codigo_interno=$1, id_producto=$2, capacidad=$3, propiedad=$4, id_propietario=$5, estado=$6, observaciones_generales=$7
             WHERE id_envase=$8 RETURNING *`,
            [codigo_interno, id_producto, capacidad, propiedad, id_propietario || null, estado, observaciones_generales, id]
        );
        return result.rows[0];
    },
    updateEstado: async (id, estado) => {
        const result = await db.query('UPDATE envases SET estado=$1 WHERE id_envase=$2 RETURNING *', [estado, id]);
        return result.rows[0];
    },
    delete: async (id) => {
        await db.query('UPDATE envases SET activo = false WHERE id_envase = $1', [id]);
        return { message: 'Envase eliminado correctamente' };
    },
    getResumen: async () => {
        const result = await db.query("SELECT estado, COUNT(*) as cantidad FROM envases WHERE activo = true GROUP BY estado");
        return result.rows;
    },
    getObservaciones: async (idEnvase) => {
        const result = await db.query(
            `SELECT o.*, t.nombre as trabajador FROM envase_observaciones o
             JOIN trabajadores t ON o.id_trabajador = t.id_trabajador
             WHERE o.id_envase = $1 ORDER BY o.fecha DESC`, [idEnvase]
        );
        return result.rows;
    },
    addObservacion: async (data) => {
        const { id_envase, id_trabajador, tipo, descripcion } = data;
        const result = await db.query(
            'INSERT INTO envase_observaciones (id_envase, id_trabajador, tipo, descripcion) VALUES ($1,$2,$3,$4) RETURNING *',
            [id_envase, id_trabajador, tipo, descripcion]
        );
        return result.rows[0];
    }
};

module.exports = Envase;
