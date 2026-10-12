const db = require('../config/database');

const Transaccion = {
    getAll: async () => {
        const result = await db.query(`
            SELECT t.*, c.razon_social as cliente, c.rut 
            FROM transacciones t 
            JOIN clientes c ON t.id_cliente = c.id_cliente 
            ORDER BY t.fecha DESC
        `);
        return result.rows;
    },

    getById: async (id) => {
        const result = await db.query(`
            SELECT t.*, c.razon_social as cliente, c.rut 
            FROM transacciones t 
            JOIN clientes c ON t.id_cliente = c.id_cliente 
            WHERE t.id_transaccion = ?
        `, [id]);
        return result.rows[0];
    },

    getDetalle: async (idTransaccion) => {
        const result = await db.query(`
            SELECT d.*, p.nombre as gas 
            FROM detalle_transacciones d 
            JOIN productos p ON d.id_producto = p.id_producto 
            WHERE d.id_transaccion = ?
        `, [idTransaccion]);
        return result.rows;
    },

    create: async (data, detalle) => {
        return db.transaction(() => {
            const { id_cliente, numero_documento, tipo_documento, patente_vehiculo, preparado_por, observaciones } = data;
            const result = db.prepare(
                `INSERT INTO transacciones (id_cliente, numero_documento, tipo_documento, patente_vehiculo, preparado_por, observaciones) 
                 VALUES (?, ?, ?, ?, ?, ?)`
            ).run(id_cliente, numero_documento, tipo_documento, patente_vehiculo, preparado_por, observaciones);

            const transaccionId = result.lastInsertRowid;

            if (detalle && detalle.length > 0) {
                const dtInsert = db.prepare(
                    `INSERT INTO detalle_transacciones (id_transaccion, id_producto, cantidad, cantidad_envases, tipo_operacion, precio_unitario, subtotal) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`
                );
                for (const item of detalle) {
                    const subtotal = item.cantidad * item.precio_unitario;
                    dtInsert.run(transaccionId, item.id_producto, item.cantidad, item.cantidad_envases || 1, item.tipo_operacion, item.precio_unitario, subtotal);
                }
            }

            return db.prepare('SELECT * FROM transacciones WHERE id_transaccion = ?').get(transaccionId);
        })();
    },

    update: async (id, data) => {
        const { patente_vehiculo, preparado_por, observaciones, estado } = data;
        const result = await db.query(
            `UPDATE transacciones SET patente_vehiculo=?, preparado_por=?, observaciones=?, estado=? 
             WHERE id_transaccion=?`,
            [patente_vehiculo, preparado_por, observaciones, estado, id]
        );
        const updated = await db.query('SELECT * FROM transacciones WHERE id_transaccion = ?', [id]);
        return updated.rows[0];
    },

    anular: async (id) => {
        const result = await db.query(
            "UPDATE transacciones SET estado = 'Anulada' WHERE id_transaccion = ?",
            [id]
        );
        const updated = await db.query('SELECT * FROM transacciones WHERE id_transaccion = ?', [id]);
        return updated.rows[0];
    },

    getByFecha: async (fechaInicio, fechaFin) => {
        const result = await db.query(`
            SELECT t.*, c.razon_social as cliente, c.rut 
            FROM transacciones t 
            JOIN clientes c ON t.id_cliente = c.id_cliente 
            WHERE t.fecha BETWEEN ? AND ? 
            ORDER BY t.fecha DESC
        `, [fechaInicio, fechaFin]);
        return result.rows;
    },

    getByCliente: async (idCliente) => {
        const result = await db.query(`
            SELECT t.*, c.razon_social as cliente, c.rut 
            FROM transacciones t 
            JOIN clientes c ON t.id_cliente = c.id_cliente 
            WHERE t.id_cliente = ? 
            ORDER BY t.fecha DESC
        `, [idCliente]);
        return result.rows;
    },

    getResumenDiario: async () => {
        const result = await db.query(`
            SELECT 
                date(fecha) as dia,
                COUNT(*) as total_transacciones,
                COUNT(DISTINCT id_cliente) as clientes_atendidos
            FROM transacciones 
            WHERE estado != 'Anulada' 
            GROUP BY date(fecha) 
            ORDER BY dia DESC 
            LIMIT 30
        `);
        return result.rows;
    }
};

module.exports = Transaccion;