const db = require('../config/database');

const OrdenTrabajo = {
    getAll: async () => {
        const result = await db.query(`
            SELECT ot.*, e.codigo_interno, t.nombre as asignado_nombre,
                   dr.observaciones as recepcion_observaciones
            FROM ordenes_trabajo ot
            JOIN envases e ON ot.id_envase = e.id_envase
            JOIN detalle_recepciones dr ON ot.id_detalle_recepcion = dr.id_detalle
            LEFT JOIN trabajadores t ON ot.id_asignado = t.id_trabajador
            ORDER BY ot.fecha_creacion DESC
        `);
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query(`
            SELECT ot.*, e.codigo_interno, t.nombre as asignado_nombre,
                   pr.nombre as gas, c.razon_social as cliente
            FROM ordenes_trabajo ot
            JOIN envases e ON ot.id_envase = e.id_envase
            JOIN detalle_recepciones dr ON ot.id_detalle_recepcion = dr.id_detalle
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            JOIN productos pr ON e.id_producto = pr.id_producto
            LEFT JOIN trabajadores t ON ot.id_asignado = t.id_trabajador
            WHERE ot.id_orden = $1
        `, [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { id_detalle_recepcion, id_envase, tipo_trabajo, prioridad, id_asignado, descripcion_trabajo } = data;
        const result = await db.query(
            `INSERT INTO ordenes_trabajo (id_detalle_recepcion, id_envase, tipo_trabajo, prioridad, id_asignado, descripcion_trabajo)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [id_detalle_recepcion, id_envase, tipo_trabajo, prioridad || 'Normal', id_asignado, descripcion_trabajo]
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
        const result = await db.query(
            `UPDATE ordenes_trabajo SET estado = 'Completada', resultado = $1, repuestos = $2, tiempo_invertido = $3,
             fecha_cierre = CURRENT_TIMESTAMP WHERE id_orden = $4 RETURNING *`,
            [resultado, repuestos, tiempo_invertido, id]
        );
        const ot = result.rows[0];
        if (ot) {
            await db.query("UPDATE envases SET estado = 'Disponible' WHERE id_envase = $1", [ot.id_envase]);
        }
        return ot;
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
            SELECT ot.*, e.codigo_interno, t.nombre as asignado_nombre
            FROM ordenes_trabajo ot
            JOIN envases e ON ot.id_envase = e.id_envase
            LEFT JOIN trabajadores t ON ot.id_asignado = t.id_trabajador
            WHERE ot.estado IN ('Pendiente', 'En proceso')
            ORDER BY ot.prioridad, ot.fecha_creacion
        `);
        return result.rows;
    }
};

module.exports = OrdenTrabajo;
