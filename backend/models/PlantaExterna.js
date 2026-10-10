const db = require('../config/database');

const PlantaExterna = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM plantas_externas WHERE activa = true ORDER BY razon_social');
        return result.rows;
    },
    getAllIncluyendoInactivas: async () => {
        const result = await db.query('SELECT * FROM plantas_externas ORDER BY razon_social');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM plantas_externas WHERE id_planta = $1', [id]);
        return result.rows[0];
    },
    create: async (data) => {
        const { rut, razon_social, direccion, persona_contacto, telefono, email } = data;
        const result = await db.query(
            `INSERT INTO plantas_externas (rut, razon_social, direccion, persona_contacto, telefono, email)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [rut, razon_social, direccion, persona_contacto, telefono, email]
        );
        return result.rows[0];
    },
    update: async (id, data) => {
        const { rut, razon_social, direccion, persona_contacto, telefono, email, activa } = data;
        const result = await db.query(
            `UPDATE plantas_externas 
             SET rut=$1, razon_social=$2, direccion=$3, persona_contacto=$4, telefono=$5, email=$6, activa=$7
             WHERE id_planta=$8 RETURNING *`,
            [rut, razon_social, direccion, persona_contacto, telefono, email, activa, id]
        );
        return result.rows[0];
    },
    delete: async (id) => {
        await db.query('UPDATE plantas_externas SET activa = false WHERE id_planta = $1', [id]);
        return { message: 'Planta externa desactivada correctamente' };
    }
};

module.exports = PlantaExterna;