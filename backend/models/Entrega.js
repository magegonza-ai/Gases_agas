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
            JOIN trabajadores t ON e.id_despachador = t.id_trabajador
            WHERE e.id_entrega = ?
        `, [id]);
        return result.rows[0];
    },
    getDetalle: async (idEntrega) => {
        const result = await db.query(`
            SELECT de.*, e.codigo_interno, COALESCE(pl.nombre, p.nombre) as gas, l.cantidad, l.destino
            FROM detalle_entregas de
            JOIN envases e ON de.id_envase = e.id_envase
            LEFT JOIN llenados l ON de.id_llenado = l.id_llenado
            LEFT JOIN productos pl ON l.gas_llenado = pl.id_producto
            LEFT JOIN productos p ON e.id_producto = p.id_producto
            WHERE de.id_entrega = ?
        `, [idEntrega]);
        return result.rows;
    },
    getParaEntregar: async (idCliente) => {
        const result = await db.query(`
            SELECT e.id_envase, e.codigo_interno, e.capacidad,
                   COALESCE(pl.nombre, p.nombre) as gas_nombre, c.razon_social as cliente,
                   l.id_llenado, l.cantidad, l.destino, dr.id_detalle, dr.gas_solicitado
            FROM envases e
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN detalle_recepciones dr ON e.id_envase = dr.id_envase
               AND dr.id_detalle = (SELECT MAX(d2.id_detalle) FROM detalle_recepciones d2 WHERE d2.id_envase = e.id_envase)
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            LEFT JOIN llenados l ON e.id_envase = l.id_envase
               AND l.id_llenado = (SELECT MAX(l2.id_llenado) FROM llenados l2 WHERE l2.id_envase = e.id_envase)
            LEFT JOIN productos pl ON l.gas_llenado = pl.id_producto
            WHERE r.id_cliente = ? AND e.estado IN ('Lleno', 'En bodega', 'Por entregar')
            ORDER BY e.codigo_interno
        `, [idCliente]);
        return result.rows;
    },
    create: async (data, detalle) => {
        return db.transaction(() => {
            const { id_cliente, id_despachador, numero_documento, tipo_documento, patente_vehiculo, firma_cliente, observaciones } = data;
            const result = db.prepare(
                `INSERT INTO entregas (id_cliente, id_despachador, numero_documento, tipo_documento, patente_vehiculo, firma_cliente, observaciones)
                 VALUES (?,?,?,?,?,?,?)`
            ).run(id_cliente, id_despachador, numero_documento, tipo_documento, patente_vehiculo, firma_cliente, observaciones);
            const entregaId = result.lastInsertRowid;

            if (detalle && detalle.length > 0) {
                const deInsert = db.prepare('INSERT INTO detalle_entregas (id_entrega, id_llenado, id_envase) VALUES (?,?,?)');
                const envaseUpdate = db.prepare("UPDATE envases SET estado = 'Entregado' WHERE id_envase = ?");
                
                for (const item of detalle) {
                    deInsert.run(entregaId, item.id_llenado, item.id_envase);
                    envaseUpdate.run(item.id_envase);
                }
            }

            return db.prepare('SELECT * FROM entregas WHERE id_entrega = ?').get(entregaId);
        })();
    }
};

module.exports = Entrega;