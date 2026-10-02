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
            WHERE t.id_transaccion = $1
        `, [id]);
        return result.rows[0];
    },

    getDetalle: async (idTransaccion) => {
        const result = await db.query(`
            SELECT d.*, p.nombre as gas 
            FROM detalle_transacciones d 
            JOIN productos p ON d.id_producto = p.id_producto 
            WHERE d.id_transaccion = $1
        `, [idTransaccion]);
        return result.rows;
    },

    create: async (data, detalle) => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const { id_cliente, numero_documento, tipo_documento, patente_vehiculo, preparado_por, observaciones } = data;
            const result = await client.query(
                `INSERT INTO transacciones (id_cliente, numero_documento, tipo_documento, patente_vehiculo, preparado_por, observaciones) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [id_cliente, numero_documento, tipo_documento, patente_vehiculo, preparado_por, observaciones]
            );

            const transaccion = result.rows[0];

            if (detalle && detalle.length > 0) {
                for (const item of detalle) {
                    const subtotal = item.cantidad * item.precio_unitario;
                    await client.query(
                        `INSERT INTO detalle_transacciones (id_transaccion, id_producto, cantidad, cantidad_envases, tipo_operacion, precio_unitario, subtotal) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [transaccion.id_transaccion, item.id_producto, item.cantidad, item.cantidad_envases || 1, item.tipo_operacion, item.precio_unitario, subtotal]
                    );
                }
            }

            await client.query('COMMIT');
            return transaccion;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    update: async (id, data) => {
        const { patente_vehiculo, preparado_por, observaciones, estado } = data;
        const result = await db.query(
            `UPDATE transacciones SET patente_vehiculo=$1, preparado_por=$2, observaciones=$3, estado=$4 
             WHERE id_transaccion=$5 RETURNING *`,
            [patente_vehiculo, preparado_por, observaciones, estado, id]
        );
        return result.rows[0];
    },

    anular: async (id) => {
        const result = await db.query(
            "UPDATE transacciones SET estado = 'Anulada' WHERE id_transaccion = $1 RETURNING *",
            [id]
        );
        return result.rows[0];
    },

    getByFecha: async (fechaInicio, fechaFin) => {
        const result = await db.query(`
            SELECT t.*, c.razon_social as cliente, c.rut 
            FROM transacciones t 
            JOIN clientes c ON t.id_cliente = c.id_cliente 
            WHERE t.fecha BETWEEN $1 AND $2 
            ORDER BY t.fecha DESC
        `, [fechaInicio, fechaFin]);
        return result.rows;
    },

    getByCliente: async (idCliente) => {
        const result = await db.query(`
            SELECT t.*, c.razon_social as cliente, c.rut 
            FROM transacciones t 
            JOIN clientes c ON t.id_cliente = c.id_cliente 
            WHERE t.id_cliente = $1 
            ORDER BY t.fecha DESC
        `, [idCliente]);
        return result.rows;
    },

    getResumenDiario: async () => {
        const result = await db.query(`
            SELECT 
                DATE(fecha) as dia,
                COUNT(*) as total_transacciones,
                COUNT(DISTINCT id_cliente) as clientes_atendidos
            FROM transacciones 
            WHERE estado != 'Anulada' 
            GROUP BY DATE(fecha) 
            ORDER BY dia DESC 
            LIMIT 30
        `);
        return result.rows;
    }
};

module.exports = Transaccion;
