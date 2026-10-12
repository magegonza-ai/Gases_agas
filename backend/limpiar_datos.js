// ============================================================
//  PROMINER - Limpieza de datos OPERATIVOS
//  Conserva los catálogos (clientes, trabajadores, productos,
//  plantas externas y cargos) y borra SOLO los movimientos:
//  recepciones, cilindros, guías, órdenes de trabajo, llenados,
//  entregas, transacciones y observaciones.
//  Reinicia las numeraciones y restaura el stock base de gases.
// ============================================================
const db = require('./config/database');

const SEMILLA_STOCK = {
    'Oxigeno': 5000.00, 'Acetileno': 2000.00, 'Nitrogeno': 4000.00,
    'Argon': 3000.00, 'CO2': 2500.00, 'N2O': 1000.00, 'Mezcla': 800.00,
};

const limpiar = db.transaction(() => {
    // 1) Borrar movimientos (orden seguro por claves foráneas)
    db.exec('DELETE FROM detalle_entregas');
    db.exec('DELETE FROM entregas');
    db.exec('DELETE FROM guias_despacho');
    db.exec('DELETE FROM llenados');
    db.exec('DELETE FROM ordenes_trabajo');
    db.exec('DELETE FROM detalle_recepciones');
    db.exec('DELETE FROM recepciones');
    db.exec('DELETE FROM detalle_transacciones');
    db.exec('DELETE FROM transacciones');
    db.exec('DELETE FROM envase_observaciones');
    db.exec('DELETE FROM envases');

    // 2) Reiniciar secuencias / numeraciones
    const tablas = [
        'envases', 'envase_observaciones', 'recepciones', 'detalle_recepciones',
        'ordenes_trabajo', 'llenados', 'guias_despacho', 'entregas',
        'detalle_entregas', 'transacciones', 'detalle_transacciones',
    ];
    for (const t of tablas) {
        db.exec(`DELETE FROM sqlite_sequence WHERE name = '${t}'`);
    }

    // 3) Restaurar el stock base de los productos
    const stmt = db.prepare('UPDATE productos SET stock_disponible = ? WHERE nombre = ?');
    for (const [nombre, stock] of Object.entries(SEMILLA_STOCK)) stmt.run(stock, nombre);
});

try {
    limpiar();
    console.log('✅ Datos operativos eliminados correctamente.');
} catch (err) {
    console.error('❌ Error al limpiar:', err.message);
    process.exit(1);
}

const q = (sql) => db.prepare(sql).get();
console.log('   Recepciones:      ', q('SELECT COUNT(*) c FROM recepciones').c);
console.log('   Cilindros:        ', q('SELECT COUNT(*) c FROM envases').c);
console.log('   Guías de despacho:', q('SELECT COUNT(*) c FROM guias_despacho').c);
console.log('   Órdenes de trabajo:', q('SELECT COUNT(*) c FROM ordenes_trabajo').c);
console.log('   Llenados:         ', q('SELECT COUNT(*) c FROM llenados').c);
console.log('   Entregas:         ', q('SELECT COUNT(*) c FROM entregas').c);
console.log('   Transacciones:    ', q('SELECT COUNT(*) c FROM transacciones').c);
console.log('   --- Catálogos conservados ---');
console.log('   Clientes:   ', q('SELECT COUNT(*) c FROM clientes').c);
console.log('   Trabajadores:', q('SELECT COUNT(*) c FROM trabajadores').c);
console.log('   Productos:  ', q('SELECT COUNT(*) c FROM productos').c);
console.log('   Plantas:    ', q('SELECT COUNT(*) c FROM plantas_externas').c);

db.close();
