const db = require('../config/database');

const Trabajador = {
    getAll: async () => {
        const result = await db.query(`
            SELECT t.*, STRING_AGG(c.nombre, ', ' ORDER BY c.nombre) AS cargos
            FROM trabajadores t
            LEFT JOIN trabajador_cargos tc ON t.id_trabajador = tc.id_trabajador
            LEFT JOIN cargos c ON tc.id_cargo = c.id_cargo
            WHERE t.activo = true
            GROUP BY t.id_trabajador
            ORDER BY t.nombre
        `);
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query(`
            SELECT t.*, STRING_AGG(c.nombre, ', ' ORDER BY c.nombre) AS cargos
            FROM trabajadores t
            LEFT JOIN trabajador_cargos tc ON t.id_trabajador = tc.id_trabajador
            LEFT JOIN cargos c ON tc.id_cargo = c.id_cargo
            WHERE t.id_trabajador = $1
            GROUP BY t.id_trabajador
        `, [id]);
        return result.rows[0];
    },
    getByCargo: async (cargo) => {
        const result = await db.query(`
            SELECT DISTINCT t.*, STRING_AGG(c2.nombre, ', ' ORDER BY c2.nombre) AS cargos
            FROM trabajadores t
            JOIN trabajador_cargos tc ON t.id_trabajador = tc.id_trabajador
            JOIN cargos c ON tc.id_cargo = c.id_cargo
            LEFT JOIN trabajador_cargos tc2 ON t.id_trabajador = tc2.id_trabajador
            LEFT JOIN cargos c2 ON tc2.id_cargo = c2.id_cargo
            WHERE c.nombre = $1 AND t.activo = true
            GROUP BY t.id_trabajador
            ORDER BY t.nombre
        `, [cargo]);
        return result.rows;
    },
    create: async (data) => {
        const { nombre, cargos, telefono } = data;
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                'INSERT INTO trabajadores (nombre, telefono) VALUES ($1, $2) RETURNING *',
                [nombre, telefono]
            );
            const trabajador = result.rows[0];
            if (cargos && cargos.length > 0) {
                for (const cargoNombre of cargos) {
                    const cargoRes = await client.query('SELECT id_cargo FROM cargos WHERE nombre = $1', [cargoNombre]);
                    if (cargoRes.rows.length > 0) {
                        await client.query(
                            'INSERT INTO trabajador_cargos (id_trabajador, id_cargo) VALUES ($1, $2)',
                            [trabajador.id_trabajador, cargoRes.rows[0].id_cargo]
                        );
                    }
                }
            }
            await client.query('COMMIT');
            return trabajador;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },
    update: async (id, data) => {
        const { nombre, cargos, telefono } = data;
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                'UPDATE trabajadores SET nombre=$1, telefono=$2 WHERE id_trabajador=$3 RETURNING *',
                [nombre, telefono, id]
            );
            await client.query('DELETE FROM trabajador_cargos WHERE id_trabajador = $1', [id]);
            if (cargos && cargos.length > 0) {
                for (const cargoNombre of cargos) {
                    const cargoRes = await client.query('SELECT id_cargo FROM cargos WHERE nombre = $1', [cargoNombre]);
                    if (cargoRes.rows.length > 0) {
                        await client.query(
                            'INSERT INTO trabajador_cargos (id_trabajador, id_cargo) VALUES ($1, $2)',
                            [id, cargoRes.rows[0].id_cargo]
                        );
                    }
                }
            }
            await client.query('COMMIT');
            return result.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },
    delete: async (id) => {
        await db.query('UPDATE trabajadores SET activo = false WHERE id_trabajador = $1', [id]);
        return { message: 'Trabajador eliminado correctamente' };
    }
};

module.exports = Trabajador;
