const db = require('../config/database');

const Envase = {
    getAll: async () => {
        const result = await db.query(`
            SELECT e.*, p.nombre as gas, c.razon_social as propietario_nombre,
                   pe.razon_social as planta_externa
            FROM envases e
            JOIN productos p ON e.id_producto = p.id_producto
            LEFT JOIN clientes c ON e.id_propietario = c.id_cliente
            LEFT JOIN plantas_externas pe ON e.id_planta_externa = pe.id_planta
            WHERE e.activo = 1
            ORDER BY e.codigo_interno
        `);
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query(`
            SELECT e.*, p.nombre as gas, c.razon_social as propietario_nombre,
                   pe.razon_social as planta_externa
            FROM envases e
            JOIN productos p ON e.id_producto = p.id_producto
            LEFT JOIN clientes c ON e.id_propietario = c.id_cliente
            LEFT JOIN plantas_externas pe ON e.id_planta_externa = pe.id_planta
            WHERE e.id_envase = ?
        `, [id]);
        return result.rows[0];
    },
    getByCodigo: async (codigo) => {
        const result = await db.query(`
            SELECT e.*, p.nombre as gas, c.razon_social as propietario_nombre,
                   pe.razon_social as planta_externa
            FROM envases e
            JOIN productos p ON e.id_producto = p.id_producto
            LEFT JOIN clientes c ON e.id_propietario = c.id_cliente
            LEFT JOIN plantas_externas pe ON e.id_planta_externa = pe.id_planta
            WHERE e.codigo_interno = ?
        `, [codigo]);
        return result.rows[0];
    },
    create: async (data) => {
        const { 
            codigo_interno, id_producto, capacidad, propiedad, id_propietario, 
            estado, observaciones_generales, tipo_llenado, id_planta_externa,
            prueba_hidraulica, requiere_pintura
        } = data;
        const result = await db.query(
            `INSERT INTO envases 
             (codigo_interno, id_producto, capacidad, propiedad, id_propietario, estado, observaciones_generales,
              tipo_llenado, id_planta_externa, prueba_hidraulica, requiere_pintura)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [
                codigo_interno, id_producto, capacidad, propiedad, id_propietario || null, 
                estado || 'Disponible', observaciones_generales,
                tipo_llenado || null, id_planta_externa || null,
                prueba_hidraulica || 'Pendiente', requiere_pintura ? 1 : 0
            ]
        );
        const inserted = await db.query('SELECT * FROM envases WHERE id_envase = ?', [result.lastInsertRowid]);
        return inserted.rows[0];
    },
    update: async (id, data) => {
        const { 
            codigo_interno, capacidad, propiedad, id_propietario, estado, 
            observaciones_generales, tipo_llenado, id_planta_externa,
            prueba_hidraulica, requiere_pintura
        } = data;
        const result = await db.query(
            `UPDATE envases SET 
                codigo_interno=?, capacidad=?, propiedad=?, id_propietario=?, 
                estado=?, observaciones_generales=?,
                tipo_llenado=?, id_planta_externa=?,
                prueba_hidraulica=?, requiere_pintura=?,
                fecha_prueba_hidraulica = CASE WHEN ? IN ('Aprobado','Rechazado') THEN COALESCE(fecha_prueba_hidraulica, datetime('now')) ELSE fecha_prueba_hidraulica END
             WHERE id_envase=?`,
            [
                codigo_interno, capacidad, propiedad, id_propietario || null, 
                estado, observaciones_generales,
                tipo_llenado || null, id_planta_externa || null,
                prueba_hidraulica || 'Pendiente', requiere_pintura ? 1 : 0,
                prueba_hidraulica,
                id
            ]
        );
        const updated = await db.query('SELECT * FROM envases WHERE id_envase = ?', [id]);
        return updated.rows[0];
    },
    updateEstado: async (id, estado) => {
        const result = await db.query('UPDATE envases SET estado=? WHERE id_envase=?', [estado, id]);
        const updated = await db.query('SELECT * FROM envases WHERE id_envase = ?', [id]);
        return updated.rows[0];
    },
    getParaLlenado: async () => {
        // Cilindros listos para llenado local (sin OT pendiente)
        const result = await db.query(`
            SELECT * FROM vw_envases_completo 
            WHERE estado IN ('Vacio','En llenado') 
            ORDER BY codigo_interno
        `);
        return result.rows;
    },
    getPendientesEntrega: async () => {
        // Cilindros disponibles para la entrega al cliente
        const result = await db.query(`
            SELECT * FROM vw_envases_completo 
            WHERE estado IN ('En bodega','Lleno','Por entregar')
            ORDER BY codigo_interno
        `);
        return result.rows;
    },
    delete: async (id) => {
        await db.query('UPDATE envases SET activo = 0 WHERE id_envase = ?', [id]);
        return { message: 'Envase eliminado correctamente' };
    },
    getResumen: async () => {
        const result = await db.query("SELECT estado, COUNT(*) as cantidad FROM envases WHERE activo = 1 GROUP BY estado");
        return result.rows;
    },
    getObservaciones: async (idEnvase) => {
        const result = await db.query(
            `SELECT o.*, t.nombre as trabajador FROM envase_observaciones o
             JOIN trabajadores t ON o.id_trabajador = t.id_trabajador
             WHERE o.id_envase = ? ORDER BY o.fecha DESC`, [idEnvase]
        );
        return result.rows;
    },
    addObservacion: async (data) => {
        const { id_envase, id_trabajador, tipo, descripcion } = data;
        const result = await db.query(
            'INSERT INTO envase_observaciones (id_envase, id_trabajador, tipo, descripcion) VALUES (?,?,?,?)',
            [id_envase, id_trabajador, tipo, descripcion]
        );
        const inserted = await db.query('SELECT * FROM envase_observaciones WHERE id_observacion = ?', [result.lastInsertRowid]);
        return inserted.rows[0];
    }
};

module.exports = Envase;