const db = require('../config/database');

const pad = (n, len) => String(n).padStart(len, '0');
const p2 = (n) => pad(n, 2);

// Comprobante secuencial por día: REC-YYYYMMDD-0001 (reinicia cada día)
function siguienteComprobante() {
    const f = new Date();
    const fecha = `${f.getFullYear()}${p2(f.getMonth() + 1)}${p2(f.getDate())}`;
    const n = db.prepare("SELECT COUNT(*) as c FROM recepciones WHERE numero_comprobante LIKE ?")
        .get(`REC-${fecha}-%`).c;
    return `REC-${fecha}-${pad(n + 1, 4)}`;
}

// Número secuencial global para guías y OTs: GUIA-00001 / OT-00001
function siguienteDeTabla(prefix, tabla, colId) {
    const row = db.prepare(`SELECT COALESCE(MAX(${colId}), 0) as mx FROM ${tabla}`).get();
    return `${prefix}${pad(row.mx + 1, 5)}`;
}

const ESTADOS_INGRESO_PERMITIDOS = ['Disponible', 'Vacio', 'Entregado'];

const Recepcion = {
    siguienteComprobante,
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
            SELECT r.*, c.razon_social as cliente, c.rut, c.direccion, c.comuna, c.telefono, c.email,
                   t.nombre as recepcionista
            FROM recepciones r
            JOIN clientes c ON r.id_cliente = c.id_cliente
            JOIN trabajadores t ON r.id_recepcionista = t.id_trabajador
            WHERE r.id_recepcion = ?
        `, [id]);
        return result.rows[0];
    },
    getDetalle: async (idRecepcion) => {
        const result = await db.query(`
            SELECT dr.*, e.codigo_interno, e.capacidad, p.nombre as gas_nombre, pr.nombre as gas_solicitado_nombre,
                   pe.razon_social as planta_externa
            FROM detalle_recepciones dr
            JOIN envases e ON dr.id_envase = e.id_envase
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN productos pr ON dr.gas_solicitado = pr.id_producto
            LEFT JOIN plantas_externas pe ON dr.id_planta_externa = pe.id_planta
            WHERE dr.id_recepcion = ?
        `, [idRecepcion]);
        return result.rows;
    },
    create: async (data, detalle) => {
        return db.transaction(() => {
            const { id_cliente, id_recepcionista, observaciones } = data;

            // Número de comprobante generado por el servidor (secuencial por día)
            let numero_comprobante = siguienteComprobante();
            const existeComprobante = db.prepare('SELECT 1 FROM recepciones WHERE numero_comprobante = ?');
            const baseComprobante = numero_comprobante;
            let sufijo = 1;
            while (existeComprobante.get(numero_comprobante)) {
                numero_comprobante = `${baseComprobante}-${sufijo++}`;
            }
            const result = db.prepare(
                `INSERT INTO recepciones (id_cliente, id_recepcionista, numero_comprobante, observaciones)
                 VALUES (?,?,?,?)`
            ).run(id_cliente, id_recepcionista, numero_comprobante, observaciones);
            const recepcionId = result.lastInsertRowid;

            if (detalle && detalle.length > 0) {
                const drInsert = db.prepare(
                    `INSERT INTO detalle_recepciones 
                     (id_recepcion, id_envase, gas_solicitado, cantidad_llenado, estado_recibido, requiere_reparacion, observaciones,
                      prueba_hidraulica, requiere_pintura, tipo_llenado, id_planta_externa)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
                );

                const envaseUpdate = db.prepare(
                    `UPDATE envases SET 
                        estado = ?, 
                        tipo_llenado = ?, 
                        id_planta_externa = ?,
                        prueba_hidraulica = ?,
                        requiere_pintura = ?,
                        fecha_prueba_hidraulica = CASE WHEN ? IN ('Aprobado','Rechazado') THEN datetime('now') ELSE NULL END
                     WHERE id_envase = ?`
                );

                const guiaInsert = db.prepare(
                    `INSERT INTO guias_despacho 
                     (id_detalle_recepcion, id_planta_externa, numero_guia, prueba_hidraulica_resultado)
                     VALUES (?,?,?,?)`
                );

                const otInsert = db.prepare(
                    `INSERT INTO ordenes_trabajo 
                     (numero_orden, id_detalle_recepcion, id_envase, tipo_trabajo, descripcion_trabajo,
                      requiere_prueba_hidraulica, requiere_pintura, fecha_entrega_estimada)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                );

                const vistos = new Set();

                for (const item of detalle) {
                    // Validación de cilindro
                    const env = db.prepare('SELECT * FROM envases WHERE id_envase = ?').get(item.id_envase);
                    if (!env) {
                        throw new Error(`El cilindro (id ${item.id_envase}) no existe en el catálogo`);
                    }
                    const codigo = env.codigo_interno;

                    if (vistos.has(item.id_envase)) {
                        throw new Error(`El cilindro ${codigo} aparece más de una vez en el detalle de la recepción`);
                    }
                    vistos.add(item.id_envase);

                    // No se puede ingresar un cilindro que sigue en una recepción/guía en proceso (no entregado)
                    const abierto = db.prepare(
                        'SELECT COUNT(*) as c FROM detalle_recepciones WHERE id_envase = ? AND procesado = 0'
                    ).get(item.id_envase).c;
                    if (abierto > 0) {
                        throw new Error(
                            `El cilindro ${codigo} ya está registrado en una recepción o guía en proceso y aún no ha sido entregado al cliente. ` +
                            `No puede ingresarse nuevamente.`
                        );
                    }

                    if (!ESTADOS_INGRESO_PERMITIDOS.includes(env.estado)) {
                        throw new Error(
                            `El cilindro ${codigo} está en estado "${env.estado}" y aún no ha sido entregado al cliente. ` +
                            `No puede ingresarse nuevamente hasta que sea entregado.`
                        );
                    }

                    // Cantidad a llenar: obligatoria en toda recepción. Es el dato que queda en el comprobante
                    // y que luego usa el proceso de llenado (no se vuelve a preguntar).
                    const cantidad = (item.cantidad_llenado === undefined || item.cantidad_llenado === null || item.cantidad_llenado === '')
                        ? null : Number(item.cantidad_llenado);
                    if (cantidad === null) {
                        throw new Error(`Debe indicar la cantidad a llenar del cilindro ${codigo}`);
                    }
                    if (!(cantidad > 0)) {
                        throw new Error(`La cantidad a llenar del cilindro ${codigo} debe ser mayor que 0`);
                    }
                    if (env.capacidad && cantidad > env.capacidad) {
                        throw new Error(
                            `La cantidad a llenar (${cantidad}) del cilindro ${codigo} no puede ser mayor a su capacidad (${env.capacidad} L)`
                        );
                    }

                    const drResult = drInsert.run(
                        recepcionId, item.id_envase, item.gas_solicitado, cantidad,
                        item.estado_recibido, item.requiere_reparacion ? 1 : 0, item.observaciones,
                        item.prueba_hidraulica || 'Pendiente', item.requiere_pintura ? 1 : 0,
                        item.tipo_llenado || 'Local', item.id_planta_externa || null
                    );
                    const idDetalle = drResult.lastInsertRowid;

                    // Un cilindro no puede llenarse sin la prueba hidráulica aprobada.
                    // Si al recibir está Pendiente o Rechazada (o cualquier estado distinto de Aprobado),
                    // se genera una OT para realizarla y dejarla aprobada.
                    const pruebaHidraulica = item.prueba_hidraulica || 'Pendiente';
                    const pruebaNoAprobada = pruebaHidraulica !== 'Aprobado';
                    const esLocal = !item.tipo_llenado || item.tipo_llenado === 'Local';
                    const requiereOT = esLocal && (item.requiere_reparacion || item.requiere_pintura || pruebaNoAprobada);

                    // Actualizar envase
                    const nuevoEstado = item.tipo_llenado === 'Externo' ? 'En planta externa'
                                       : requiereOT ? 'En OT local'
                                       : 'Vacio';

                    envaseUpdate.run(
                        nuevoEstado,
                        item.tipo_llenado || 'Local',
                        item.id_planta_externa || null,
                        pruebaHidraulica,
                        item.requiere_pintura ? 1 : 0,
                        pruebaHidraulica,
                        item.id_envase
                    );

                    // Guía de traslado automática si es externo (numeración secuencial GUIA-00001...)
                    if (item.tipo_llenado === 'Externo' && item.id_planta_externa) {
                        const guiaNum = siguienteDeTabla('GUIA-', 'guias_despacho', 'id_guia');
                        const resPrueba = ['Aprobado', 'Rechazado'].includes(pruebaHidraulica) ? pruebaHidraulica : null;
                        guiaInsert.run(idDetalle, item.id_planta_externa, guiaNum, resPrueba);
                    }

                    // OT local si requiere prueba hidráulica (no aprobada), reparación o pintura
                    // (numeración secuencial OT-00001...)
                    if (requiereOT) {
                        const tipoTrabajo = pruebaNoAprobada ? 'Prueba hidraulica' :
                                           item.requiere_pintura ? 'Pintura/Identificacion' : 'Reparacion de valvula';
                        const otNum = siguienteDeTabla('OT-', 'ordenes_trabajo', 'id_orden');
                        otInsert.run(
                            otNum, idDetalle, item.id_envase, tipoTrabajo,
                            item.observaciones || 'Requiere revision',
                            pruebaNoAprobada ? 1 : 0,
                            item.requiere_pintura ? 1 : 0,
                            item.fecha_entrega_estimada || null
                        );
                    }
                }
            }

            const saved = db.prepare('SELECT * FROM recepciones WHERE id_recepcion = ?').get(recepcionId);
            saved.detalle = db.prepare('SELECT * FROM detalle_recepciones WHERE id_recepcion = ?').all(recepcionId);
            return saved;
        })();
    },
    close: async (id) => {
        const result = await db.query("UPDATE recepciones SET estado = 'Cerrada' WHERE id_recepcion = ?", [id]);
        const updated = await db.query('SELECT * FROM recepciones WHERE id_recepcion = ?', [id]);
        return updated.rows[0];
    }
};

module.exports = Recepcion;