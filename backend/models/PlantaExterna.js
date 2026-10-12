const db = require('../config/database');

const PlantaExterna = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM plantas_externas WHERE activa = 1 ORDER BY razon_social');
        return result.rows;
    },
    getAllIncluyendoInactivas: async () => {
        const result = await db.query('SELECT * FROM plantas_externas ORDER BY razon_social');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM plantas_externas WHERE id_planta = ?', [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { rut, razon_social, direccion, persona_contacto, telefono, email } = data;
        const result = await db.query(
            `INSERT INTO plantas_externas (rut, razon_social, direccion, persona_contacto, telefono, email)
             VALUES (?,?,?,?,?,?)`,
            [rut, razon_social, direccion, persona_contacto, telefono, email]
        );
        const inserted = await db.query('SELECT * FROM plantas_externas WHERE id_planta = ?', [result.lastInsertRowid]);
        return inserted.rows[0];
    },
    update: async (id, data) => {
        const { rut, razon_social, direccion, persona_contacto, telefono, email, activa } = data;
        const result = await db.query(
            `UPDATE plantas_externas 
             SET rut=?, razon_social=?, direccion=?, persona_contacto=?, telefono=?, email=?, activa=?
             WHERE id_planta=?`,
            [rut, razon_social, direccion, persona_contacto, telefono, email, activa ? 1 : 0, id]
        );
        const updated = await db.query('SELECT * FROM plantas_externas WHERE id_planta = ?', [id]);
        return updated.rows[0];
    },
    delete: async (id) => {
        await db.query('UPDATE plantas_externas SET activa = 0 WHERE id_planta = ?', [id]);
        return { message: 'Planta externa desactivada correctamente' };
    }
};

module.exports = PlantaExterna;