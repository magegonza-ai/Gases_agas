const db = require('../config/database');

const pad = (n, len) => String(n).padStart(len, '0');

// Número secuencial de OT: OT-00001, OT-00002, ...
function siguienteNumeroOrden() {
    const row = db.prepare('SELECT COALESCE(MAX(id_orden), 0) as mx FROM ordenes_trabajo').get();
    return `OT-${pad(row.mx + 1, 5)}`;
}

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
            WHERE ot.id_orden = ?
        `, [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { id_detalle_recepcion, id_envase, tipo_trabajo, prioridad, id_asignado, descripcion_trabajo, requiere_prueba_hidraulica, requiere_pintura, fecha_entrega_estimada } = data;
        // Numeración secuencial desde OT-00001
        const numero_orden = data.numero_orden || siguienteNumeroOrden();
        const result = await db.query(
            `INSERT INTO ordenes_trabajo 
             (numero_orden, id_detalle_recepcion, id_envase, tipo_trabajo, prioridad, id_asignado, descripcion_trabajo,
              requiere_prueba_hidraulica, requiere_pintura, fecha_entrega_estimada)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [numero_orden, id_detalle_recepcion, id_envase, tipo_trabajo, prioridad || 'Normal', id_asignado, descripcion_trabajo,
             requiere_prueba_hidraulica ? 1 : 0, requiere_pintura ? 1 : 0, fecha_entrega_estimada || null]
        );
        const inserted = await db.query('SELECT * FROM ordenes_trabajo WHERE id_orden = ?', [result.lastInsertRowid]);
        return inserted.rows[0];
    },
    start: async (id, idAsignado) => {
        const result = await db.query(
            "UPDATE ordenes_trabajo SET estado = 'En proceso', id_asignado = ?, fecha_inicio = datetime('now') WHERE id_orden = ?",
            [idAsignado, id]
        );
        const updated = await db.query('SELECT * FROM ordenes_trabajo WHERE id_orden = ?', [id]);
        return updated.rows[0];
    },
    // Registro del avance de los trabajos por hora (campo texto del detalle de trabajos)
    registrarAvance: async (id, detalle) => {
        return db.transaction(() => {
            const ot = db.prepare('SELECT * FROM ordenes_trabajo WHERE id_orden = ?').get(id);
            if (!ot) return null;
            if (ot.estado === 'Completada' || ot.estado === 'Cancelada') {
                throw new Error(`No se pueden registrar avances en una OT ${ot.estado.toLowerCase()}`);
            }
            if (!detalle || !String(detalle).trim()) {
                throw new Error('Debe indicar el detalle del avance');
            }
            const ts = db.prepare("SELECT datetime('now', 'localtime') as dt").get().dt;
            const linea = `[${ts}] ${String(detalle).trim()}`;
            db.prepare(
                `UPDATE ordenes_trabajo SET registro_horario =
                    CASE WHEN registro_horario IS NULL OR registro_horario = '' THEN ?
                         ELSE registro_horario || char(10) || ? END
                 WHERE id_orden = ?`
            ).run(linea, linea, id);
            return db.prepare('SELECT * FROM ordenes_trabajo WHERE id_orden = ?').get(id);
        })();
    },
    complete: async (id, data) => {
        const { resultado, repuestos, tiempo_invertido, prueba_hidraulica_resultado, pintura_realizada } = data;
        return db.transaction(() => {
            const ot = db.prepare('SELECT * FROM ordenes_trabajo WHERE id_orden = ?').get(id);
            if (!ot) return null;
            if (ot.estado === 'Completada' || ot.estado === 'Cancelada') {
                throw new Error(`La OT ${ot.numero_orden} ya fue ${ot.estado.toLowerCase()}`);
            }

            // Si la OT requiere prueba hidráulica, debe quedar realizada y APROBADA
            let pruebaResult = null;
            if (ot.requiere_prueba_hidraulica) {
                pruebaResult = prueba_hidraulica_resultado || null;
                if (pruebaResult !== 'Aprobado') {
                    throw new Error('La prueba hidráulica debe realizarse y quedar APROBADA para completar la OT');
                }
            }

            // Si la OT requiere pintura, se debe confirmar que fue realizada
            if (ot.requiere_pintura && !pintura_realizada) {
                throw new Error('Debe confirmar que la pintura fue realizada para completar la OT');
            }

            db.prepare(
                `UPDATE ordenes_trabajo SET estado = 'Completada', resultado = ?, repuestos = ?, tiempo_invertido = ?,
                 prueba_hidraulica_resultado = COALESCE(?, prueba_hidraulica_resultado),
                 pintura_realizada = ?, fecha_cierre = datetime('now') WHERE id_orden = ?`
            ).run(resultado, repuestos, tiempo_invertido, pruebaResult, pintura_realizada ? 1 : 0, id);

            // Reflejar los trabajos realizados en el cilindro y en el detalle de recepción
            if (pruebaResult === 'Aprobado') {
                db.prepare("UPDATE envases SET prueba_hidraulica = 'Aprobado', fecha_prueba_hidraulica = datetime('now') WHERE id_envase = ?")
                    .run(ot.id_envase);
                db.prepare("UPDATE detalle_recepciones SET prueba_hidraulica = 'Aprobado' WHERE id_detalle = ?")
                    .run(ot.id_detalle_recepcion);
            }
            if (ot.requiere_pintura && pintura_realizada) {
                db.prepare('UPDATE envases SET requiere_pintura = 0 WHERE id_envase = ?').run(ot.id_envase);
            }

            const otActualizada = db.prepare('SELECT * FROM ordenes_trabajo WHERE id_orden = ?').get(id);
            if (otActualizada) {
                const otherOTs = db.prepare(
                    "SELECT COUNT(*) as count FROM ordenes_trabajo WHERE id_envase = ? AND estado IN ('Pendiente','En proceso') AND id_orden != ?"
                ).get(otActualizada.id_envase, otActualizada.id_orden);
                if (otherOTs.count === 0) {
                    // Al terminar la OT, el cilindro se libera para su llenado
                    db.prepare("UPDATE envases SET estado = 'Vacio' WHERE id_envase = ?").run(otActualizada.id_envase);
                }
            }
            return otActualizada;
        })();
    },
    cancel: async (id) => {
        const result = await db.query(
            "UPDATE ordenes_trabajo SET estado = 'Cancelada', fecha_cierre = datetime('now') WHERE id_orden = ?",
            [id]
        );
        const updated = await db.query('SELECT * FROM ordenes_trabajo WHERE id_orden = ?', [id]);
        return updated.rows[0];
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
            ORDER BY ot.fecha_entrega_estimada NULLS LAST, ot.prioridad DESC, ot.fecha_creacion
        `);
        return result.rows;
    }
};

module.exports = OrdenTrabajo;