const db = require('../config/database');

const pad = (n, len) => String(n).padStart(len, '0');

// Número secuencial de guía: GUIA-00001, GUIA-00002, ...
function siguienteNumeroGuia() {
    const row = db.prepare('SELECT COALESCE(MAX(id_guia), 0) as mx FROM guias_despacho').get();
    return `GUIA-${pad(row.mx + 1, 5)}`;
}

const GuiaDespacho = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM vw_guias_despacho_completo ORDER BY fecha_envio DESC');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM vw_guias_despacho_completo WHERE id_guia = ?', [id]);
        return result.rows[0];
    },
    getByDetalleRecepcion: async (idDetalle) => {
        const result = await db.query('SELECT * FROM guias_despacho WHERE id_detalle_recepcion = ? ORDER BY fecha_envio DESC', [idDetalle]);
        return result.rows;
    },
    create: async (data) => {
        const { id_detalle_recepcion, id_planta_externa, chofer, patente_vehiculo, observaciones, prueba_hidraulica_resultado } = data;
        // La columna prueba_hidraulica_resultado solo admite Aprobado/Rechazado (CHECK); cualquier otro valor => NULL
        const resPrueba = ['Aprobado', 'Rechazado'].includes(prueba_hidraulica_resultado) ? prueba_hidraulica_resultado : null;
        // Numeración secuencial desde 00001 si no se entrega una explícita
        const numero_guia = data.numero_guia || siguienteNumeroGuia();
        const result = await db.query(
            `INSERT INTO guias_despacho (id_detalle_recepcion, id_planta_externa, numero_guia, chofer, patente_vehiculo, observaciones, prueba_hidraulica_resultado)
             VALUES (?,?,?,?,?,?,?)`,
            [id_detalle_recepcion, id_planta_externa, numero_guia, chofer, patente_vehiculo, observaciones, resPrueba]
        );
        const inserted = await db.query('SELECT * FROM guias_despacho WHERE id_guia = ?', [result.lastInsertRowid]);
        return inserted.rows[0];
    },
    update: async (id, data) => {
        const { chofer, patente_vehiculo, observaciones, estado, fecha_recepcion_planta, fecha_retorno } = data;
        const result = await db.query(
            `UPDATE guias_despacho SET chofer=?, patente_vehiculo=?, observaciones=?, estado=?, fecha_recepcion_planta=?, fecha_retorno=?
             WHERE id_guia=?`,
            [chofer, patente_vehiculo, observaciones, estado, fecha_recepcion_planta, fecha_retorno, id]
        );
        const updated = await db.query('SELECT * FROM guias_despacho WHERE id_guia = ?', [id]);
        return updated.rows[0];
    },
    recibirEnPlanta: async (id) => {
        const result = await db.query(
            `UPDATE guias_despacho SET estado='Recibida', fecha_recepcion_planta=datetime('now') WHERE id_guia=?`,
            [id]
        );
        const updated = await db.query('SELECT * FROM guias_despacho WHERE id_guia = ?', [id]);
        return updated.rows[0];
    },
    // Recepción desde la planta externa: registra los trabajos realizados y el llenado,
    // y deja el cilindro disponible para la entrega al cliente.
    retornarDePlanta: async (id, data = {}) => {
        return db.transaction(() => {
            const g = db.prepare('SELECT * FROM guias_despacho WHERE id_guia = ?').get(id);
            if (!g) return null;
            if (g.estado === 'Devuelta' || g.estado === 'Cancelada') {
                throw new Error(`La guía ${g.numero_guia} ya fue ${g.estado.toLowerCase()}`);
            }

            const det = db.prepare(
                `SELECT dr.*, e.id_producto, e.capacidad, e.codigo_interno
                 FROM detalle_recepciones dr
                 JOIN envases e ON dr.id_envase = e.id_envase
                 WHERE dr.id_detalle = ?`
            ).get(g.id_detalle_recepcion);
            if (!det) {
                throw new Error('No se encontró el detalle de recepción asociado a la guía');
            }

            // Detalle de los trabajos que la planta externa realizó al cilindro
            const trabajos = (data.trabajos_realizados || '').trim();
            if (!trabajos) {
                throw new Error('Debe detallar los trabajos realizados en la planta externa');
            }

            // No se puede llenar un cilindro sin la prueba hidráulica aprobada
            const prueba = data.prueba_hidraulica_resultado;
            if (prueba !== 'Aprobado') {
                throw new Error('El cilindro no puede llenarse sin la prueba hidráulica aprobada');
            }

            // Cantidad llenada en la planta (por defecto, la solicitada en la recepción)
            const cantidad = (data.cantidad_llenada === undefined || data.cantidad_llenada === null || data.cantidad_llenada === '')
                ? Number(det.cantidad_llenado)
                : Number(data.cantidad_llenada);
            if (!(cantidad > 0)) {
                throw new Error('La cantidad llenada debe ser mayor que 0');
            }
            if (det.capacidad && cantidad > det.capacidad) {
                throw new Error(`La cantidad llenada (${cantidad}) no puede ser mayor a la capacidad del cilindro (${det.capacidad} L)`);
            }

            // Quién recibe/registra el retorno
            const idLlenador = data.id_llenador ? Number(data.id_llenador) : null;
            if (!idLlenador) {
                throw new Error('Debe indicar quién recibe el cilindro de vuelta de la planta');
            }
            if (!db.prepare('SELECT 1 FROM trabajadores WHERE id_trabajador = ?').get(idLlenador)) {
                throw new Error('El trabajador indicado no existe');
            }

            // El gas llenado debe coincidir con el gas del cilindro
            const gasLlenado = data.gas_llenado ? Number(data.gas_llenado) : det.id_producto;
            if (gasLlenado !== det.id_producto) {
                throw new Error('El gas llenado no coincide con el gas del cilindro');
            }

            const destino = ['Retiro inmediato', 'Bodega temporal'].includes(data.destino) ? data.destino : 'Retiro inmediato';

            // Registrar la recepción desde planta en la guía
            db.prepare(
                `UPDATE guias_despacho SET estado='Devuelta', fecha_retorno=datetime('now'),
                 trabajos_realizados=?, prueba_hidraulica_resultado=? WHERE id_guia=?`
            ).run(trabajos, prueba, id);

            // Registrar el llenado efectuado en la planta externa
            db.prepare(
                `INSERT INTO llenados (id_detalle_recepcion, id_envase, id_llenador, gas_llenado, cantidad, destino, id_planta_externa, prueba_hidraulica_resultado)
                 VALUES (?,?,?,?,?,?,?,?)`
            ).run(g.id_detalle_recepcion, det.id_envase, idLlenador, gasLlenado, cantidad, destino, g.id_planta_externa, prueba);

            // El cilindro queda disponible para la entrega al cliente
            const nuevoEstado = destino === 'Retiro inmediato' ? 'Lleno' : 'En bodega';
            db.prepare(
                `UPDATE envases SET estado=?, prueba_hidraulica='Aprobado',
                 fecha_prueba_hidraulica=COALESCE(fecha_prueba_hidraulica, datetime('now')),
                 fecha_ultimo_llenado=datetime('now') WHERE id_envase=?`
            ).run(nuevoEstado, det.id_envase);
            db.prepare('UPDATE detalle_recepciones SET procesado = 1, prueba_hidraulica = ? WHERE id_detalle = ?')
                .run(prueba, g.id_detalle_recepcion);
            db.prepare('UPDATE productos SET stock_disponible = stock_disponible - ? WHERE id_producto = ?')
                .run(cantidad, gasLlenado);

            return db.prepare('SELECT * FROM guias_despacho WHERE id_guia = ?').get(id);
        })();
    }
};

module.exports = GuiaDespacho;