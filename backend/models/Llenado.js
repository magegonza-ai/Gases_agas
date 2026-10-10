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
            SELECT dr.*, e.codigo_interno, p.nombre as gas_nombre, pr.nombre as gas_solicitado_nombre,
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
            WHERE dr.procesado = FALSE 
              AND (dr.requiere_reparacion = FALSE OR dr.requiere_reparacion IS NULL)
              AND (dr.prueba_hidraulica != 'Rechazado' OR dr.prueba_hidraulica IS NULL)
              AND e.estado IN ('Vacio', 'En llenado', 'En OT local', 'Por entregar')
            ORDER BY r.fecha_recepcion
        `);
        return result.rows;
    },
    // Nuevo: llenados en tránsito (plantas externas)
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
    // Nuevo: historial de llenados completados
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
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const { id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidad, destino, id_planta_externa, prueba_hidraulica_resultado } = data;
            
            // Validar que el gas llenado coincida con el gas del cilindro (inmutable)
            const envaseCheck = await client.query('SELECT id_producto FROM envases WHERE id_envase = $1', [id_envase]);
            if (envaseCheck.rows.length > 0 && envaseCheck.rows[0].id_producto != gas_llenado) {
                throw new Error('El gas a llenar no coincide con el gas del cilindro');
            }

            const result = await client.query(
                `INSERT INTO llenados (id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidad, destino, id_planta_externa, prueba_hidraulica_resultado)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
                [id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidad, destino, id_planta_externa || null, prueba_hidraulica_resultado || null]
            );
            
            const nuevoEstado = destino === 'Retiro inmediato' ? 'Lleno' : 'En bodega';
            await client.query('UPDATE envases SET estado = $1, fecha_ultimo_llenado = CURRENT_TIMESTAMP WHERE id_envase = $2', [nuevoEstado, id_envase]);
            await client.query('UPDATE detalle_recepciones SET procesado = TRUE WHERE id_detalle = $1', [id_detalle_recepcion]);
            await client.query('UPDATE productos SET stock_disponible = stock_disponible - $1 WHERE id_producto = $2', [cantidad, gas_llenado]);
            
            // Si era de planta externa, actualizar guía
            if (id_planta_externa) {
                await client.query(
                    `UPDATE guias_despacho SET estado = 'Devuelta', fecha_retorno = NOW() 
                     WHERE id_detalle_recepcion = $1 AND estado IN ('Enviada','Recibida')`,
                    [id_detalle_recepcion]
                );
            }
            
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