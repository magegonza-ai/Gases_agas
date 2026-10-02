const db = require('../config/database');

const Cliente = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM clientes WHERE activo = true ORDER BY razon_social');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM clientes WHERE id_cliente = $1', [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { razon_social, rut, direccion, comuna, telefono, email } = data;
        const result = await db.query(
            'INSERT INTO clientes (razon_social, rut, direccion, comuna, telefono, email) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [razon_social, rut, direccion, comuna, telefono, email]
        );
        return result.rows[0];
    },
    update: async (id, data) => {
        const { razon_social, rut, direccion, comuna, telefono, email } = data;
        const result = await db.query(
            'UPDATE clientes SET razon_social=$1, rut=$2, direccion=$3, comuna=$4, telefono=$5, email=$6 WHERE id_cliente=$7 RETURNING *',
            [razon_social, rut, direccion, comuna, telefono, email, id]
        );
        return result.rows[0];
    },
    delete: async (id) => {
        await db.query('UPDATE clientes SET activo = false WHERE id_cliente = $1', [id]);
        return { message: 'Cliente eliminado correctamente' };
    },
    search: async (term) => {
        const result = await db.query(
            'SELECT * FROM clientes WHERE activo = true AND (razon_social ILIKE $1 OR rut ILIKE $1) ORDER BY razon_social',
            [`%${term}%`]
        );
        return result.rows;
    }
};

module.exports = Cliente;
