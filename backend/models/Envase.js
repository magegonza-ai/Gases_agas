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
            WHERE e.activo = true
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
            WHERE e.id_envase = $1
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
            WHERE e.codigo_interno = $1
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
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [
                codigo_interno, id_producto, capacidad, propiedad, id_propietario || null, 
                estado || 'Disponible', observaciones_generales,
                tipo_llenado || null, id_planta_externa || null,
                prueba_hidraulica || 'Pendiente', requiere_pintura || false
            ]
        );
        return result.rows[0];
    },
    update: async (id, data) => {
        // IMPORTANTE: No permitir cambiar id_producto (gas del cilindro)
        const { 
            codigo_interno, capacidad, propiedad, id_propietario, estado, 
            observaciones_generales, tipo_llenado, id_planta_externa,
            prueba_hidraulica, requiere_pintura
        } = data;
        const result = await db.query(
            `UPDATE envases SET 
                codigo_interno=$1, capacidad=$2, propiedad=$3, id_propietario=$4, 
                estado=$5, observaciones_generales=$6,
                tipo_llenado=$7, id_planta_externa=$8,
                prueba_hidraulica=$9, requiere_pintura=$10,
                fecha_prueba_hidraulica = CASE WHEN $9 = 'Aprobado' OR $9 = 'Rechazado' THEN COALESCE(fecha_prueba_hidraulica, NOW()) ELSE fecha_prueba_hidraulica END
             WHERE id_envase=$11 RETURNING *`,
            [
                codigo_interno, capacidad, propiedad, id_propietario || null, 
                estado, observaciones_generales,
                tipo_llenado || null, id_planta_externa || null,
                prueba_hidraulica || 'Pendiente', requiere_pintura || false,
                id
            ]
        );
        return result.rows[0];
    },
    updateEstado: async (id, estado) => {
        const result = await db.query('UPDATE envases SET estado=$1 WHERE id_envase=$2 RETURNING *', [estado, id]);
        return result.rows[0];
    },
    // Nuevo: obtener cilindros para llenado (vista)
    getParaLlenado: async () => {
        const result = await db.query('SELECT * FROM vw_cilindros_llenado WHERE estado IN ($1,$2,$3,$4,$5) ORDER BY codigo_interno',
            ['Vacio', 'En llenado', 'En planta externa', 'En OT local', 'Por entregar']);
        return result.rows;
    },
    // Nuevo: obtener cilindros pendientes de entrega
    getPendientesEntrega: async () => {
        const result = await db.query('SELECT * FROM vw_cilindros_pendientes_entrega');
        return result.rows;
    },
    delete: async (id) => {
        await db.query('UPDATE envases SET activo = false WHERE id_envase = $1', [id]);
        return { message: 'Envase eliminado correctamente' };
    },
    getResumen: async () => {
        const result = await db.query("SELECT estado, COUNT(*) as cantidad FROM envases WHERE activo = true GROUP BY estado");
        return result.rows;
    },
    getObservaciones: async (idEnvase) => {
        const result = await db.query(
            `SELECT o.*, t.nombre as trabajador FROM envase_observaciones o
             JOIN trabajadores t ON o.id_trabajador = t.id_trabajador
             WHERE o.id_envase = $1 ORDER BY o.fecha DESC`, [idEnvase]
        );
        return result.rows;
    },
    addObservacion: async (data) => {
        const { id_envase, id_trabajador, tipo, descripcion } = data;
        const result = await db.query(
            'INSERT INTO envase_observaciones (id_envase, id_trabajador, tipo, descripcion) VALUES ($1,$2,$3,$4) RETURNING *',
            [id_envase, id_trabajador, tipo, descripcion]
        );
        return result.rows[0];
    }
};

module.exports = Envase;