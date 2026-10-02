const db = require('../config/database');

const Recepcion = {
    getAll: async () => {
        const result = await db.query(`
            SELECT r.*, c.razon_social as cliente, t.nombre as recepcionista,
                   (SELECT COUNT(*) FROM detalle_recepciones dr WHERE dr.id_recepcion = r.id_recepcion) as total_cilindros
            FROM recepciones r
            JOIN clientes c ON r.id_cliente = c.id_cliente
            JOIN trabajadores t ON r.id_recepcionista = t.id_trabajador
            ORDER BY r.fecha_recepcion DESC
        `);
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query(`
            SELECT r.*, c.razon_social as cliente, c.rut, t.nombre as recepcionista
            FROM recepciones r
            JOIN clientes c ON r.id_cliente = c.id_cliente
            JOIN trabajadores t ON r.id_recepcionista = t.id_trabajador
            WHERE r.id_recepcion = $1
        `, [id]);
        return result.rows[0];
    },
    getDetalle: async (idRecepcion) => {
        const result = await db.query(`
            SELECT dr.*, e.codigo_interno, p.nombre as gas_nombre, pr.nombre as gas_solicitado_nombre
            FROM detalle_recepciones dr
            JOIN envases e ON dr.id_envase = e.id_envase
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN productos pr ON dr.gas_solicitado = pr.id_producto
            WHERE dr.id_recepcion = $1
        `, [idRecepcion]);
        return result.rows;
    },
    create: async (data, detalle) => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const { id_cliente, id_recepcionista, numero_comprobante, observaciones } = data;
            const result = await client.query(
                `INSERT INTO recepciones (id_cliente, id_recepcionista, numero_comprobante, observaciones)
                 VALUES ($1,$2,$3,$4) RETURNING *`,
                [id_cliente, id_recepcionista, numero_comprobante, observaciones]
            );
            const recepcion = result.rows[0];

            if (detalle && detalle.length > 0) {
                for (const item of detalle) {
                    await client.query(
                        `INSERT INTO detalle_recepciones (id_recepcion, id_envase, gas_solicitado, estado_recibido, requiere_reparacion, observaciones)
                         VALUES ($1,$2,$3,$4,$5,$6)`,
                        [recepcion.id_recepcion, item.id_envase, item.gas_solicitado, item.estado_recibido, item.requiere_reparacion || false, item.observaciones]
                    );
                    await client.query("UPDATE envases SET estado = 'Vacio' WHERE id_envase = $1", [item.id_envase]);
                    if (item.requiere_reparacion) {
                        const dr = await client.query('SELECT id_detalle FROM detalle_recepciones WHERE id_recepcion=$1 AND id_envase=$2 ORDER BY id_detalle DESC LIMIT 1', [recepcion.id_recepcion, item.id_envase]);
                        await client.query(
                            `INSERT INTO ordenes_trabajo (id_detalle_recepcion, id_envase, tipo_trabajo, descripcion_trabajo)
                             VALUES ($1, $2, 'Prueba hidraulica', $3)`,
                            [dr.rows[0].id_detalle, item.id_envase, item.observaciones || 'Requiere revision']
                        );
                        await client.query("UPDATE envases SET estado = 'En reparacion' WHERE id_envase = $1", [item.id_envase]);
                    }
                }
            }
            await client.query('COMMIT');
            return recepcion;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    close: async (id) => {
        const result = await db.query("UPDATE recepciones SET estado = 'Cerrada' WHERE id_recepcion = $1 RETURNING *", [id]);
        return result.rows[0];
    }
};

module.exports = Recepcion;
