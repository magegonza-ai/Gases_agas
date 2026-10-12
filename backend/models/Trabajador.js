const db = require('../config/database');

const Trabajador = {
    getAll: async () => {
        const result = await db.query(`
            SELECT t.*, GROUP_CONCAT(c.nombre, ', ') AS cargos
            FROM trabajadores t
            LEFT JOIN trabajador_cargos tc ON t.id_trabajador = tc.id_trabajador
            LEFT JOIN cargos c ON tc.id_cargo = c.id_cargo
            WHERE t.activo = 1
            GROUP BY t.id_trabajador
            ORDER BY t.nombre
        `);
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query(`
            SELECT t.*, GROUP_CONCAT(c.nombre, ', ') AS cargos
            FROM trabajadores t
            LEFT JOIN trabajador_cargos tc ON t.id_trabajador = tc.id_trabajador
            LEFT JOIN cargos c ON tc.id_cargo = c.id_cargo
            WHERE t.id_trabajador = ?
            GROUP BY t.id_trabajador
        `, [id]);
        return result.rows[0];
    },
    getByCargo: async (cargo) => {
        const result = await db.query(`
            SELECT DISTINCT t.*, GROUP_CONCAT(c2.nombre, ', ') AS cargos
            FROM trabajadores t
            JOIN trabajador_cargos tc ON t.id_trabajador = tc.id_trabajador
            JOIN cargos c ON tc.id_cargo = c.id_cargo
            LEFT JOIN trabajador_cargos tc2 ON t.id_trabajador = tc2.id_trabajador
            LEFT JOIN cargos c2 ON tc2.id_cargo = c2.id_cargo
            WHERE c.nombre = ? AND t.activo = 1
            GROUP BY t.id_trabajador
            ORDER BY t.nombre
        `, [cargo]);
        return result.rows;
    },
    getCargos: async () => {
        const result = await db.query('SELECT * FROM cargos ORDER BY nombre');
        return result.rows;
    },
    create: async (data) => {
        const { nombre, cargos, telefono } = data;
        return db.transaction(() => {
            const result = db.prepare('INSERT INTO trabajadores (nombre, telefono) VALUES (?, ?)').run(nombre, telefono);
            const trabajadorId = result.lastInsertRowid;
            
            if (cargos && cargos.length > 0) {
                const stmt = db.prepare('INSERT INTO trabajador_cargos (id_trabajador, id_cargo) VALUES (?, ?)');
                for (const cargoNombre of cargos) {
                    const cargo = db.prepare('SELECT id_cargo FROM cargos WHERE nombre = ?').get(cargoNombre);
                    if (cargo) {
                        stmt.run(trabajadorId, cargo.id_cargo);
                    }
                }
            }
            
            return db.prepare('SELECT * FROM trabajadores WHERE id_trabajador = ?').get(trabajadorId);
        })();
    },
    update: async (id, data) => {
        const { nombre, cargos, telefono } = data;
        return db.transaction(() => {
            db.prepare('UPDATE trabajadores SET nombre = ?, telefono = ? WHERE id_trabajador = ?').run(nombre, telefono, id);
            db.prepare('DELETE FROM trabajador_cargos WHERE id_trabajador = ?').run(id);
            
            if (cargos && cargos.length > 0) {
                const stmt = db.prepare('INSERT INTO trabajador_cargos (id_trabajador, id_cargo) VALUES (?, ?)');
                for (const cargoNombre of cargos) {
                    const cargo = db.prepare('SELECT id_cargo FROM cargos WHERE nombre = ?').get(cargoNombre);
                    if (cargo) {
                        stmt.run(id, cargo.id_cargo);
                    }
                }
            }
            
            return db.prepare('SELECT * FROM trabajadores WHERE id_trabajador = ?').get(id);
        })();
    },
    delete: async (id) => {
        await db.query('UPDATE trabajadores SET activo = 0 WHERE id_trabajador = ?', [id]);
        return { message: 'Trabajador eliminado correctamente' };
    }
};

module.exports = Trabajador;