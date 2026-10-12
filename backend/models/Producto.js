const db = require('../config/database');

const Producto = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM productos WHERE activo = 1 ORDER BY nombre');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM productos WHERE id_producto = ?', [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo } = data;
        const result = await db.query(
            'INSERT INTO productos (nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo) VALUES (?,?,?,?,?,?)',
            [nombre, descripcion, unidad_medida, precio_unitario, stock_disponible || 0, stock_minimo || 0]
        );
        const inserted = await db.query('SELECT * FROM productos WHERE id_producto = ?', [result.lastInsertRowid]);
        return inserted.rows[0];
    },
    update: async (id, data) => {
        const { nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo } = data;
        const result = await db.query(
            'UPDATE productos SET nombre=?, descripcion=?, unidad_medida=?, precio_unitario=?, stock_disponible=?, stock_minimo=? WHERE id_producto=?',
            [nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo, id]
        );
        const updated = await db.query('SELECT * FROM productos WHERE id_producto = ?', [id]);
        return updated.rows[0];
    },
    descontarStock: async (id, cantidad) => {
        const result = await db.query(
            'UPDATE productos SET stock_disponible = stock_disponible - ? WHERE id_producto = ? AND stock_disponible >= ?',
            [cantidad, id, cantidad]
        );
        const updated = await db.query('SELECT * FROM productos WHERE id_producto = ?', [id]);
        return updated.rows[0];
    },
    delete: async (id) => {
        await db.query('UPDATE productos SET activo = 0 WHERE id_producto = ?', [id]);
        return { message: 'Producto eliminado correctamente' };
    },
    getStockAlertas: async () => {
        const result = await db.query('SELECT * FROM vw_stock_alertas');
        return result.rows;
    }
};

module.exports = Producto;