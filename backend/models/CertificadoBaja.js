const db = require('../config/database');

const pad = (n, len) => String(n).padStart(len, '0');

// Número secuencial de certificado: CERT-00001, CERT-00002, ...
function siguienteNumero() {
    const row = db.prepare('SELECT COALESCE(MAX(id_certificado), 0) as mx FROM certificados_baja').get();
    return `CERT-${pad(row.mx + 1, 5)}`;
}

const CertificadoBaja = {
    // Creación síncrona: se invoca dentro de la transacción al completar la OT.
    crear(datos) {
        const numero_certificado = datos.numero_certificado || siguienteNumero();
        const result = db.prepare(
            `INSERT INTO certificados_baja
             (numero_certificado, id_envase, codigo_interno, gas_nombre, capacidad, cliente_nombre,
              id_orden_trabajo, id_detalle_recepcion, id_responsable, responsable_nombre, responsable_cargo, glosa)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(
            numero_certificado, datos.id_envase, datos.codigo_interno, datos.gas_nombre || null,
            datos.capacidad ?? null, datos.cliente_nombre || null,
            datos.id_orden_trabajo || null, datos.id_detalle_recepcion || null,
            datos.id_responsable || null, datos.responsable_nombre || null,
            datos.responsable_cargo || null, datos.glosa
        );
        return db.prepare('SELECT * FROM certificados_baja WHERE id_certificado = ?').get(result.lastInsertRowid);
    },
    getAll: async () => {
        const result = await db.query('SELECT * FROM certificados_baja ORDER BY fecha DESC, id_certificado DESC');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM certificados_baja WHERE id_certificado = ?', [id]);
        return result.rows[0];
    },
    getByEnvase: async (idEnvase) => {
        const result = await db.query(
            'SELECT * FROM certificados_baja WHERE id_envase = ? ORDER BY fecha DESC',
            [idEnvase]
        );
        return result.rows;
    }
};

module.exports = CertificadoBaja;
