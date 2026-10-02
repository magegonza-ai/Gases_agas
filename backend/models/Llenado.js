const db = require('../config/database');

const Llenado = {
    getAll: async () => {
        const result = await db.query(`
            SELECT l.*, e.codigo_interno, p.nombre as gas_nombre, t.nombre as llenador_nombre,
                   c.razon_social as cliente
            FROM llenados l
            JOIN envases e ON l.id_envase = e.id_envase
            JOIN productos p ON l.gas_llenado = p.id_producto
            JOIN trabajadores t ON l.id_llenador = t.id_trabajador
            JOIN detalle_recepciones dr ON l.id_detalle_recepcion = dr.id_detalle
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            ORDER BY l.fecha_llenado DESC
        `);
        return result.rows;
    },
    getPendientesLlenado: async () => {
        const result = await db.query(`
            SELECT dr.*, e.codigo_interno, p.nombre as gas_nombre, pr.nombre as gas_solicitado_nombre,
                   c.razon_social as cliente, r.numero_comprobante
            FROM detalle_recepciones dr
            JOIN envases e ON dr.id_envase = e.id_envase
            JOIN productos pr ON dr.gas_solicitado = pr.id_producto
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            LEFT JOIN productos p ON e.id_producto = p.id_producto
            WHERE dr.procesado = FALSE AND dr.requiere_reparacion = FALSE
            ORDER BY r.fecha_recepcion
        `);
        return result.rows;
    },
    create: async (data) => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const { id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidad, destino } = data;
            const result = await client.query(
                `INSERT INTO llenados (id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidad, destino)
                 VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
                [id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidad, destino]
            );
            const nuevoEstado = destino === 'Retiro inmediato' ? 'Lleno' : 'En bodega';
            await client.query('UPDATE envases SET estado = $1, fecha_ultimo_llenado = CURRENT_TIMESTAMP WHERE id_envase = $2', [nuevoEstado, id_envase]);
            await client.query('UPDATE detalle_recepciones SET procesado = TRUE WHERE id_detalle = $1', [id_detalle_recepcion]);
            await client.query('UPDATE productos SET stock_disponible = stock_disponible - $1 WHERE id_producto = $2', [cantidad, gas_llenado]);
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = Llenado;
