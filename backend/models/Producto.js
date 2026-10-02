const db = require('../config/database');

const Producto = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM productos WHERE activo = true ORDER BY nombre');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM productos WHERE id_producto = $1', [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo } = data;
        const result = await db.query(
            'INSERT INTO productos (nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [nombre, descripcion, unidad_medida, precio_unitario, stock_disponible || 0, stock_minimo || 0]
        );
        return result.rows[0];
    },
    update: async (id, data) => {
        const { nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo } = data;
        const result = await db.query(
            'UPDATE productos SET nombre=$1, descripcion=$2, unidad_medida=$3, precio_unitario=$4, stock_disponible=$5, stock_minimo=$6 WHERE id_producto=$7 RETURNING *',
            [nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo, id]
        );
        return result.rows[0];
    },
    descontarStock: async (id, cantidad) => {
        const result = await db.query(
            'UPDATE productos SET stock_disponible = stock_disponible - $1 WHERE id_producto = $2 AND stock_disponible >= $1 RETURNING *',
            [cantidad, id]
        );
        return result.rows[0];
    },
    delete: async (id) => {
        await db.query('UPDATE productos SET activo = false WHERE id_producto = $1', [id]);
        return { message: 'Producto eliminado correctamente' };
    },
    getStockAlertas: async () => {
        const result = await db.query('SELECT * FROM vw_stock_alertas');
        return result.rows;
    }
};

module.exports = Producto;
