const db = require('../config/database');

const Entrega = {
    getAll: async () => {
        const result = await db.query(`
            SELECT e.*, c.razon_social as cliente, t.nombre as despachador
            FROM entregas e
            JOIN clientes c ON e.id_cliente = c.id_cliente
            JOIN trabajadores t ON e.id_despachador = t.id_trabajador
            ORDER BY e.fecha_entrega DESC
        `);
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query(`
            SELECT e.*, c.razon_social as cliente, c.rut, t.nombre as despachador
            FROM entregas e
            JOIN clientes c ON e.id_cliente = c.id_cliente
            JOIN trabajadores t ON e.id_despachador = t.id_despachador
            WHERE e.id_entrega = $1
        `, [id]);
        return result.rows[0];
    },
    getDetalle: async (idEntrega) => {
        const result = await db.query(`
            SELECT de.*, e.codigo_interno, p.nombre as gas, l.cantidad, l.destino
            FROM detalle_entregas de
            JOIN envases e ON de.id_envase = e.id_envase
            JOIN llenados l ON de.id_llenado = l.id_llenado
            JOIN productos p ON l.gas_llenado = p.id_producto
            WHERE de.id_entrega = $1
        `, [idEntrega]);
        return result.rows;
    },
    getParaEntregar: async (idCliente) => {
        const result = await db.query(`
            SELECT l.*, e.codigo_interno, p.nombre as gas_nombre, c.razon_social as cliente
            FROM llenados l
            JOIN envases e ON l.id_envase = e.id_envase
            JOIN productos p ON l.gas_llenado = p.id_producto
            JOIN detalle_recepciones dr ON l.id_detalle_recepcion = dr.id_detalle
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            WHERE r.id_cliente = $1 AND e.estado IN ('Lleno', 'En bodega')
            ORDER BY l.fecha_llenado
        `, [idCliente]);
        return result.rows;
    },
    create: async (data, detalle) => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const { id_cliente, id_despachador, numero_documento, tipo_documento, patente_vehiculo, firma_cliente, observaciones } = data;
            const result = await client.query(
                `INSERT INTO entregas (id_cliente, id_despachador, numero_documento, tipo_documento, patente_vehiculo, firma_cliente, observaciones)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
                [id_cliente, id_despachador, numero_documento, tipo_documento, patente_vehiculo, firma_cliente, observaciones]
            );
            const entrega = result.rows[0];

            if (detalle && detalle.length > 0) {
                for (const item of detalle) {
                    await client.query(
                        'INSERT INTO detalle_entregas (id_entrega, id_llenado, id_envase) VALUES ($1,$2,$3)',
                        [entrega.id_entrega, item.id_llenado, item.id_envase]
                    );
                    await client.query("UPDATE envases SET estado = 'Entregado' WHERE id_envase = $1", [item.id_envase]);
                }
            }
            await client.query('COMMIT');
            return entrega;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = Entrega;
