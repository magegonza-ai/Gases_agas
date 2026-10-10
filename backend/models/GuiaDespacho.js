const db = require('../config/database');

const GuiaDespacho = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM vw_guias_despacho_completo ORDER BY fecha_envio DESC');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM vw_guias_despacho_completo WHERE id_guia = $1', [id]);
        return result.rows[0];
    },
    getByDetalleRecepcion: async (idDetalle) => {
        const result = await db.query('SELECT * FROM guias_despacho WHERE id_detalle_recepcion = $1 ORDER BY fecha_envio DESC', [idDetalle]);
        return result.rows;
    },
    create: async (data) => {
        const { id_detalle_recepcion, id_planta_externa, numero_guia, chofer, patente_vehiculo, observaciones, prueba_hidraulica_resultado } = data;
        const result = await db.query(
            `INSERT INTO guias_despacho (id_detalle_recepcion, id_planta_externa, numero_guia, chofer, patente_vehiculo, observaciones, prueba_hidraulica_resultado)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [id_detalle_recepcion, id_planta_externa, numero_guia, chofer, patente_vehiculo, observaciones, prueba_hidraulica_resultado]
        );
        return result.rows[0];
    },
    update: async (id, data) => {
        const { chofer, patente_vehiculo, observaciones, estado, fecha_recepcion_planta, fecha_retorno } = data;
        const result = await db.query(
            `UPDATE guias_despacho SET chofer=$1, patente_vehiculo=$2, observaciones=$3, estado=$4, fecha_recepcion_planta=$5, fecha_retorno=$6
             WHERE id_guia=$7 RETURNING *`,
            [chofer, patente_vehiculo, observaciones, estado, fecha_recepcion_planta, fecha_retorno, id]
        );
        return result.rows[0];
    },
    recibirEnPlanta: async (id) => {
        const result = await db.query(
            `UPDATE guias_despacho SET estado='Recibida', fecha_recepcion_planta=NOW() WHERE id_guia=$1 RETURNING *`,
            [id]
        );
        return result.rows[0];
    },
    retornarDePlanta: async (id) => {
        const result = await db.query(
            `UPDATE guias_despacho SET estado='Devuelta', fecha_retorno=NOW() WHERE id_guia=$1 RETURNING *`,
            [id]
        );
        return result.rows[0];
    }
};

module.exports = GuiaDespacho;