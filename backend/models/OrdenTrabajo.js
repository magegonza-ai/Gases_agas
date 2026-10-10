const db = require('../config/database');

const OrdenTrabajo = {
    getAll: async () => {
        const result = await db.query(`
            SELECT ot.*, e.codigo_interno, p.nombre as gas, t.nombre as asignado_nombre,
                   c.razon_social as cliente, ot.requiere_prueba_hidraulica, ot.requiere_pintura, ot.fecha_entrega_estimada
            FROM ordenes_trabajo ot
            JOIN envases e ON ot.id_envase = e.id_envase
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN detalle_recepciones dr ON ot.id_detalle_recepcion = dr.id_detalle
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            LEFT JOIN trabajadores t ON ot.id_asignado = t.id_trabajador
            WHERE ot.requiere_prueba_hidraulica = TRUE OR ot.requiere_pintura = TRUE
            ORDER BY ot.fecha_entrega_estimada NULLS LAST, ot.prioridad DESC, ot.fecha_creacion DESC
        `);
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query(`
            SELECT ot.*, e.codigo_interno, p.nombre as gas, c.razon_social as cliente,
                   t.nombre as asignado_nombre, ot.requiere_prueba_hidraulica, ot.requiere_pintura, ot.fecha_entrega_estimada
            FROM ordenes_trabajo ot
            JOIN envases e ON ot.id_envase = e.id_envase
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN detalle_recepciones dr ON ot.id_detalle_recepcion = dr.id_detalle
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            LEFT JOIN trabajadores t ON ot.id_asignado = t.id_trabajador
            WHERE ot.id_orden = $1
        `, [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { id_detalle_recepcion, id_envase, tipo_trabajo, prioridad, id_asignado, descripcion_trabajo, requiere_prueba_hidraulica, requiere_pintura, fecha_entrega_estimada } = data;
        const result = await db.query(
            `INSERT INTO ordenes_trabajo 
             (id_detalle_recepcion, id_envase, tipo_trabajo, prioridad, id_asignado, descripcion_trabajo,
              requiere_prueba_hidraulica, requiere_pintura, fecha_entrega_estimada)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [id_detalle_recepcion, id_envase, tipo_trabajo, prioridad || 'Normal', id_asignado, descripcion_trabajo,
             requiere_prueba_hidraulica || false, requiere_pintura || false, fecha_entrega_estimada || null]
        );
        return result.rows[0];
    },
    start: async (id, idAsignado) => {
        const result = await db.query(
            "UPDATE ordenes_trabajo SET estado = 'En proceso', id_asignado = $1, fecha_inicio = CURRENT_TIMESTAMP WHERE id_orden = $2 RETURNING *",
            [idAsignado, id]
        );
        return result.rows[0];
    },
    complete: async (id, data) => {
        const { resultado, repuestos, tiempo_invertido } = data;
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `UPDATE ordenes_trabajo SET estado = 'Completada', resultado = $1, repuestos = $2, tiempo_invertido = $3,
                 fecha_cierre = CURRENT_TIMESTAMP WHERE id_orden = $4 RETURNING *`,
                [resultado, repuestos, tiempo_invertido, id]
            );
            const ot = result.rows[0];
            if (ot) {
                // Verificar si hay otras OTs pendientes para este envase
                const otherOTs = await client.query(
                    "SELECT COUNT(*) FROM ordenes_trabajo WHERE id_envase = $1 AND estado IN ('Pendiente','En proceso') AND id_orden != $2",
                    [ot.id_envase, ot.id_orden]
                );
                if (parseInt(otherOTs.rows[0].count) === 0) {
                    // No hay más OTs, mover a Por entregar
                    await client.query("UPDATE envases SET estado = 'Por entregar' WHERE id_envase = $1", [ot.id_envase]);
                }
            }
            await client.query('COMMIT');
            return ot;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    cancel: async (id) => {
        const result = await db.query(
            "UPDATE ordenes_trabajo SET estado = 'Cancelada', fecha_cierre = CURRENT_TIMESTAMP WHERE id_orden = $1 RETURNING *",
            [id]
        );
        return result.rows[0];
    },
    getPending: async () => {
        const result = await db.query(`
            SELECT ot.*, e.codigo_interno, p.nombre as gas, t.nombre as asignado_nombre,
                   c.razon_social as cliente, ot.fecha_entrega_estimada
            FROM ordenes_trabajo ot
            JOIN envases e ON ot.id_envase = e.id_envase
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN detalle_recepciones dr ON ot.id_detalle_recepcion = dr.id_detalle
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            LEFT JOIN trabajadores t ON ot.id_asignado = t.id_trabajador
            WHERE ot.estado IN ('Pendiente', 'En proceso')
              AND (ot.requiere_prueba_hidraulica = TRUE OR ot.requiere_pintura = TRUE)
            ORDER BY ot.fecha_entrega_estimada NULLS LAST, ot.prioridad DESC, ot.fecha_creacion
        `);
        return result.rows;
    }
};

module.exports = OrdenTrabajo;