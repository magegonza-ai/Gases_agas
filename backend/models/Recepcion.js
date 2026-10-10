const db = require('../config/database');
const GuiaDespacho = require('./GuiaDespacho');

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
            SELECT dr.*, e.codigo_interno, p.nombre as gas_nombre, pr.nombre as gas_solicitado_nombre,
                   pe.razon_social as planta_externa
            FROM detalle_recepciones dr
            JOIN envases e ON dr.id_envase = e.id_envase
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN productos pr ON dr.gas_solicitado = pr.id_producto
            LEFT JOIN plantas_externas pe ON dr.id_planta_externa = pe.id_planta
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
                    // Insertar detalle con nuevos campos
                    const drResult = await client.query(
                        `INSERT INTO detalle_recepciones 
                         (id_recepcion, id_envase, gas_solicitado, estado_recibido, requiere_reparacion, observaciones,
                          prueba_hidraulica, requiere_pintura, tipo_llenado, id_planta_externa)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id_detalle`,
                        [
                            recepcion.id_recepcion, item.id_envase, item.gas_solicitado, 
                            item.estado_recibido, item.requiere_reparacion || false, item.observaciones,
                            item.prueba_hidraulica || 'Pendiente', item.requiere_pintura || false,
                            item.tipo_llenado || 'Local', item.id_planta_externa || null
                        ]
                    );
                    const idDetalle = drResult.rows[0].id_detalle;

                    // Actualizar envase con datos de recepción
                    await client.query(
                        `UPDATE envases SET 
                            estado = $1, 
                            tipo_llenado = $2, 
                            id_planta_externa = $3,
                            prueba_hidraulica = $4,
                            requiere_pintura = $5,
                            fecha_prueba_hidraulica = CASE WHEN $4 IN ('Aprobado','Rechazado') THEN NOW() ELSE NULL END
                         WHERE id_envase = $6`,
                        [
                            item.tipo_llenado === 'Externo' ? 'En planta externa' : 
                            (item.prueba_hidraulica === 'Rechazado' || item.requiere_pintura || item.requiere_reparacion) ? 'En OT local' : 'Vacio',
                            item.tipo_llenado || 'Local',
                            item.id_planta_externa || null,
                            item.prueba_hidraulica || 'Pendiente',
                            item.requiere_pintura || false,
                            item.id_envase
                        ]
                    );

                    // Si es llenado externo -> crear guía de despacho
                    if (item.tipo_llenado === 'Externo' && item.id_planta_externa) {
                        const guiaNum = `GUIA-${Date.now()}-${item.id_envase}`;
                        await client.query(
                            `INSERT INTO guias_despacho 
                             (id_detalle_recepcion, id_planta_externa, numero_guia, prueba_hidraulica_resultado)
                             VALUES ($1,$2,$3,$4)`,
                            [idDetalle, item.id_planta_externa, guiaNum, item.prueba_hidraulica]
                        );
                    }

                    // Si requiere reparación O prueba hidráulica rechazada O requiere pintura -> crear OT local
                    if (item.requiere_reparacion || item.prueba_hidraulica === 'Rechazado' || item.requiere_pintura) {
                        const tipoTrabajo = item.prueba_hidraulica === 'Rechazado' ? 'Prueba hidraulica' : 
                                           item.requiere_pintura ? 'Pintura/Identificacion' : 'Reparacion de valvula';
                        
                        await client.query(
                            `INSERT INTO ordenes_trabajo 
                             (id_detalle_recepcion, id_envase, tipo_trabajo, descripcion_trabajo,
                              requiere_prueba_hidraulica, requiere_pintura, fecha_entrega_estimada)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [
                                idDetalle, item.id_envase, tipoTrabajo, 
                                item.observaciones || 'Requiere revision',
                                item.prueba_hidraulica === 'Rechazado',
                                item.requiere_pintura,
                                item.fecha_entrega_estimada || null
                            ]
                        );
                        // Estado ya actualizado arriba a 'En OT local'
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