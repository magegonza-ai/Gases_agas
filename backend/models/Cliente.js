const db = require('../config/database');

// Helper para convertir booleans en consultas
const bool = (val) => val ? 1 : 0;

const Cliente = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM clientes WHERE activo = 1 ORDER BY razon_social');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { razon_social, rut, direccion, comuna, telefono, email } = data;
        const result = await db.query(
            'INSERT INTO clientes (razon_social, rut, direccion, comuna, telefono, email) VALUES (?,?,?,?,?,?)',
            [razon_social, rut, direccion, comuna, telefono, email]
        );
        // Obtener el registro insertado
        const inserted = await db.query('SELECT * FROM clientes WHERE id_cliente = ?', [result.lastInsertRowid]);
        return inserted.rows[0];
    },
    update: async (id, data) => {
        const { razon_social, rut, direccion, comuna, telefono, email } = data;
        const result = await db.query(
            'UPDATE clientes SET razon_social=?, rut=?, direccion=?, comuna=?, telefono=?, email=? WHERE id_cliente=?',
            [razon_social, rut, direccion, comuna, telefono, email, id]
        );
        const updated = await db.query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
        return updated.rows[0];
    },
    delete: async (id) => {
        await db.query('UPDATE clientes SET activo = 0 WHERE id_cliente = ?', [id]);
        return { message: 'Cliente eliminado correctamente' };
    },
    search: async (term) => {
        const result = await db.query(
            'SELECT * FROM clientes WHERE activo = 1 AND (razon_social LIKE ? OR rut LIKE ?) ORDER BY razon_social',
            [`%${term}%`, `%${term}%`]
        );
        return result.rows;
    }
};

module.exports = Cliente;