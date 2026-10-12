const db = require('../config/database');

const Llenado = {
    getAll: async () => {
        const result = await db.query(`
            SELECT l.*, e.codigo_interno, p.nombre as gas_nombre, t.nombre as llenador_nombre,
                   c.razon_social as cliente, pe.razon_social as planta_externa
            FROM llenados l
            JOIN envases e ON l.id_envase = e.id_envase
            JOIN productos p ON l.gas_llenado = p.id_producto
            JOIN trabajadores t ON l.id_llenador = t.id_trabajador
            JOIN detalle_recepciones dr ON l.id_detalle_recepcion = dr.id_detalle
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            LEFT JOIN plantas_externas pe ON l.id_planta_externa = pe.id_planta
            ORDER BY l.fecha_llenado DESC
        `);
        return result.rows;
    },
    getPendientesLlenado: async () => {
        const result = await db.query(`
            SELECT dr.*, e.codigo_interno, e.capacidad, p.nombre as gas_nombre, pr.nombre as gas_solicitado_nombre,
                   c.razon_social as cliente, r.numero_comprobante, r.fecha_recepcion,
                   e.tipo_llenado, e.id_planta_externa, pe.razon_social as planta_externa,
                   e.prueba_hidraulica, e.requiere_pintura
            FROM detalle_recepciones dr
            JOIN envases e ON dr.id_envase = e.id_envase
            JOIN productos pr ON dr.gas_solicitado = pr.id_producto
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            LEFT JOIN productos p ON e.id_producto = p.id_producto
            LEFT JOIN plantas_externas pe ON e.id_planta_externa = pe.id_planta
            WHERE dr.procesado = 0 
              AND e.estado IN ('Vacio', 'En llenado', 'En OT local', 'Por entregar')
              AND e.prueba_hidraulica = 'Aprobado'
              AND NOT EXISTS (
                  SELECT 1 FROM ordenes_trabajo ot2
                  WHERE ot2.id_envase = e.id_envase AND ot2.estado IN ('Pendiente','En proceso')
              )
            ORDER BY r.fecha_recepcion
        `);
        return result.rows;
    },
    getEnTransito: async () => {
        const result = await db.query(`
            SELECT g.*, e.codigo_interno, p.nombre as gas, cli.razon_social as cliente
            FROM guias_despacho g
            JOIN detalle_recepciones dr ON g.id_detalle_recepcion = dr.id_detalle
            JOIN envases e ON dr.id_envase = e.id_envase
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes cli ON r.id_cliente = cli.id_cliente
            WHERE g.estado IN ('Enviada', 'Recibida')
            ORDER BY g.fecha_envio DESC
        `);
        return result.rows;
    },
    getHistorial: async () => {
        const result = await db.query(`
            SELECT l.*, e.codigo_interno, p.nombre as gas_nombre, t.nombre as llenador_nombre,
                   c.razon_social as cliente, pe.razon_social as planta_externa,
                   dr.prueba_hidraulica, dr.requiere_pintura
            FROM llenados l
            JOIN envases e ON l.id_envase = e.id_envase
            JOIN productos p ON l.gas_llenado = p.id_producto
            JOIN trabajadores t ON l.id_llenador = t.id_trabajador
            JOIN detalle_recepciones dr ON l.id_detalle_recepcion = dr.id_detalle
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes c ON r.id_cliente = c.id_cliente
            LEFT JOIN plantas_externas pe ON l.id_planta_externa = pe.id_planta
            ORDER BY l.fecha_llenado DESC
        `);
        return result.rows;
    },
    create: async (data) => {
        return db.transaction(() => {
            const { id_detalle_recepcion, id_envase, id_llenador, gas_llenado, destino, id_planta_externa, prueba_hidraulica_resultado } = data;

            // La cantidad a llenar NO se pregunta en el proceso: proviene del comprobante de recepción
            const dr = db.prepare('SELECT * FROM detalle_recepciones WHERE id_detalle = ?').get(id_detalle_recepcion);
            if (!dr) {
                throw new Error('No se encontró el detalle de recepción asociado');
            }
            const cantidadNum = Number(dr.cantidad_llenado);
            if (!(cantidadNum > 0)) {
                throw new Error('La recepción no tiene registrada la cantidad a llenar para este cilindro');
            }

            // Validar que el gas llenado coincida con el gas del cilindro (inmutable)
            const envaseCheck = db.prepare('SELECT id_producto, capacidad, prueba_hidraulica FROM envases WHERE id_envase = ?').get(id_envase);
            if (envaseCheck && envaseCheck.id_producto != gas_llenado) {
                throw new Error('El gas a llenar no coincide con el gas del cilindro');
            }
            // No se puede llenar un cilindro sin la prueba hidráulica aprobada
            if (envaseCheck && envaseCheck.prueba_hidraulica !== 'Aprobado') {
                throw new Error('El cilindro no tiene la prueba hidráulica aprobada; no puede llenarse');
            }
            // La cantidad no puede exceder la capacidad del cilindro
            if (envaseCheck && envaseCheck.capacidad && cantidadNum > envaseCheck.capacidad) {
                throw new Error(
                    `La cantidad a llenar (${cantidadNum}) no puede ser mayor a la capacidad del cilindro (${envaseCheck.capacidad} L)`
                );
            }

            const result = db.prepare(
                `INSERT INTO llenados (id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidad, destino, id_planta_externa, prueba_hidraulica_resultado)
                 VALUES (?,?,?,?,?,?,?,?)`
            ).run(id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidadNum, destino, id_planta_externa || null, prueba_hidraulica_resultado || null);
            
            const nuevoEstado = destino === 'Retiro inmediato' ? 'Lleno' : 'En bodega';
            db.prepare("UPDATE envases SET estado = ?, fecha_ultimo_llenado = datetime('now') WHERE id_envase = ?").run(nuevoEstado, id_envase);
            db.prepare('UPDATE detalle_recepciones SET procesado = 1 WHERE id_detalle = ?').run(id_detalle_recepcion);
            db.prepare('UPDATE productos SET stock_disponible = stock_disponible - ? WHERE id_producto = ?').run(cantidadNum, gas_llenado);
            
            // Si era de planta externa, actualizar guía
            if (id_planta_externa) {
                db.prepare(
                    `UPDATE guias_despacho SET estado = 'Devuelta', fecha_retorno = datetime('now') 
                     WHERE id_detalle_recepcion = ? AND estado IN ('Enviada','Recibida')`
                ).run(id_detalle_recepcion);
            }
            
            return db.prepare('SELECT * FROM llenados WHERE id_llenado = ?').get(result.lastInsertRowid);
        })();
    }
};

module.exports = Llenado;