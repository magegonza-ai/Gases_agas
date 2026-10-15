const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

// Ruta al archivo de base de datos SQLite
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'prominer.db');

// Crear directorio si no existe
const fs = require('fs');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Inicializar conexión SQLite
const db = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Configurar PRAGMAs para mejor rendimiento
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -32768'); // 32MB cache
db.pragma('temp_store = MEMORY');

// ============================================================
//  FECHA Y HORA DEL COMPUTADOR (no UTC)
//  SQLite devuelve datetime('now') en UTC. Para que TODA la app
//  registre la fecha y hora del equipo, redefinimos la función
//  datetime() de SQLite para que 'now' use la hora LOCAL.
//  Esto cubre también los valores por defecto (DEFAULT) de las
//  tablas, por lo que no hace falta migrar la base existente.
// ============================================================
const pad2 = (n) => String(n).padStart(2, '0');

function formatearFechaHora(d, usarLocal) {
    const p = usarLocal
        ? [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()]
        : [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
    return `${p[0]}-${pad2(p[1])}-${pad2(p[2])} ${pad2(p[3])}:${pad2(p[4])}:${pad2(p[5])}`;
}

try {
    db.function('datetime', { varargs: true }, (...args) => {
        if (args.length === 0 || args[0] === null || args[0] === undefined) return null;

        const primero = String(args[0]).trim();
        let fecha;
        let usarLocal;

        if (/^now$/i.test(primero)) {
            // Hora actual del computador
            fecha = new Date();
            usarLocal = true;
        } else {
            // Interpretar texto/fecha como instante (SQLite asume UTC si no trae zona)
            let s = primero.replace(' ', 'T');
            if (!/[zZ]|[+\-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
            fecha = new Date(s);
            if (isNaN(fecha.getTime())) return null;
            usarLocal = false;
        }

        // Modificadores ('localtime', 'utc', '+N days', 'start of ...')
        for (let i = 1; i < args.length; i++) {
            const mod = String(args[i] ?? '').toLowerCase().trim();
            if (!mod) continue;
            if (mod === 'localtime') { usarLocal = true; continue; }
            if (mod === 'utc') { usarLocal = false; continue; }

            const rel = mod.match(/^([+\-]?\d+)\s*(second|minute|hour|day|month|year)s?$/);
            if (rel) {
                const n = parseInt(rel[1], 10);
                if (rel[2] === 'second') fecha.setUTCSeconds(fecha.getUTCSeconds() + n);
                else if (rel[2] === 'minute') fecha.setUTCMinutes(fecha.getUTCMinutes() + n);
                else if (rel[2] === 'hour') fecha.setUTCHours(fecha.getUTCHours() + n);
                else if (rel[2] === 'day') fecha.setUTCDate(fecha.getUTCDate() + n);
                else if (rel[2] === 'month') fecha.setUTCMonth(fecha.getUTCMonth() + n);
                else if (rel[2] === 'year') fecha.setUTCFullYear(fecha.getUTCFullYear() + n);
                continue;
            }
            if (mod === 'start of day' || mod === 'start of month' || mod === 'start of year') {
                if (usarLocal) fecha.setHours(0, 0, 0, 0); else fecha.setUTCHours(0, 0, 0, 0);
                if (mod !== 'start of day') { if (usarLocal) fecha.setDate(1); else fecha.setUTCDate(1); }
                if (mod === 'start of year') { if (usarLocal) fecha.setMonth(0); else fecha.setUTCMonth(0); }
                continue;
            }
            // Modificador no soportado: se ignora
        }

        return formatearFechaHora(fecha, usarLocal);
    });
} catch (err) {
    console.error('No se pudo registrar la función datetime local:', err.message);
}

// Helper para convertir booleans 0/1 <-> true/false
const toBool = (val) => val === 1 || val === true;
const toInt = (val) => val === true || val === 1 ? 1 : 0;

// Wrapper para mantener API compatible con pg (result.rows)
const wrapRows = (rows) => ({ rows: rows || [] });
const wrapRow = (row) => ({ rows: row ? [row] : [] });

// Ejecutar schema si no existen tablas
function initSchema() {
    // SEGURIDAD: el schema contiene DROP TABLE, por lo que NO debe re-ejecutarse
    // si la base ya está inicializada (borraría todos los datos en cada arranque).
    const yaInicializada = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='recepciones'"
    ).get();
    if (yaInicializada) {
        console.log('✅ Base de datos ya inicializada (schema no re-ejecutado, datos preservados)');
        return;
    }

    // En desarrollo: schema está en la raíz del proyecto
    // En producción (empaquetado): schema está en process.resourcesPath
    const isPackaged = !process.env.NODE_ENV || process.env.NODE_ENV === 'production';
    let schemaPath;
    
    if (isPackaged && process.resourcesPath) {
        schemaPath = path.join(process.resourcesPath, 'schema_sqlite.sql');
    } else {
        schemaPath = path.join(__dirname, '..', '..', 'schema_sqlite.sql');
    }
    
    console.log('🔍 Cargando schema desde:', schemaPath);
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('📄 Schema leído, longitud:', schema.length);
        try {
            db.exec(schema);
            console.log('✅ Schema SQLite inicializado correctamente');
        } catch (err) {
            console.error('❌ Error inicializando schema:', err.message);
            if (!err.message.includes('already exists')) {
                console.error('Error completo:', err);
            }
        }
    } else {
        console.error('❌ No se encontró schema en:', schemaPath);
    }
}

initSchema();

// Migraciones ligeras para bases de datos existentes (idempotente)
function runMigrations() {
    try {
        const cols = (tabla) => db.prepare(`PRAGMA table_info(${tabla})`).all().map(c => c.name);
        const llenadosCols = cols('llenados');
        if (llenadosCols.length && !llenadosCols.includes('id_planta_externa')) {
            db.exec('ALTER TABLE llenados ADD COLUMN id_planta_externa INTEGER REFERENCES plantas_externas(id_planta)');
            console.log('🔧 Migración aplicada: llenados.id_planta_externa');
        }
        if (llenadosCols.length && !llenadosCols.includes('prueba_hidraulica_resultado')) {
            db.exec('ALTER TABLE llenados ADD COLUMN prueba_hidraulica_resultado TEXT');
            console.log('🔧 Migración aplicada: llenados.prueba_hidraulica_resultado');
        }

        // Nueva: cantidad a llenar en detalle de recepción
        const detCols = cols('detalle_recepciones');
        if (detCols.length && !detCols.includes('cantidad_llenado')) {
            db.exec('ALTER TABLE detalle_recepciones ADD COLUMN cantidad_llenado REAL');
            console.log('🔧 Migración aplicada: detalle_recepciones.cantidad_llenado');
        }

        // Nueva: numeración y registro horario en órdenes de trabajo
        const otCols = cols('ordenes_trabajo');
        if (otCols.length && !otCols.includes('numero_orden')) {
            db.exec('ALTER TABLE ordenes_trabajo ADD COLUMN numero_orden TEXT');
            console.log('🔧 Migración aplicada: ordenes_trabajo.numero_orden');
        }
        if (otCols.length && !otCols.includes('registro_horario')) {
            db.exec('ALTER TABLE ordenes_trabajo ADD COLUMN registro_horario TEXT');
            console.log('🔧 Migración aplicada: ordenes_trabajo.registro_horario');
        }
        // Resultado de prueba hidráulica y confirmación de pintura al completar la OT
        if (otCols.length && !otCols.includes('prueba_hidraulica_resultado')) {
            db.exec('ALTER TABLE ordenes_trabajo ADD COLUMN prueba_hidraulica_resultado TEXT');
            console.log('🔧 Migración aplicada: ordenes_trabajo.prueba_hidraulica_resultado');
        }
        if (otCols.length && !otCols.includes('pintura_realizada')) {
            db.exec('ALTER TABLE ordenes_trabajo ADD COLUMN pintura_realizada INTEGER DEFAULT 0');
            console.log('🔧 Migración aplicada: ordenes_trabajo.pintura_realizada');
        }

        // Nueva: detalle de los trabajos realizados en planta externa (recepción desde planta)
        const guiaCols = cols('guias_despacho');
        if (guiaCols.length && !guiaCols.includes('trabajos_realizados')) {
            db.exec('ALTER TABLE guias_despacho ADD COLUMN trabajos_realizados TEXT');
            console.log('🔧 Migración aplicada: guias_despacho.trabajos_realizados');
        }

        // Nueva: reconstruir detalle_entregas con id_llenado opcional (permite entregar cilindros
        // retornados de planta externa sin registro de llenado)
        const detEnt = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='detalle_entregas'").get();
        if (detEnt && detEnt.sql && /id_llenado INTEGER NOT NULL/.test(detEnt.sql)) {
            db.exec('PRAGMA foreign_keys = OFF');
            const txEntrega = db.transaction(() => {
                db.exec(`CREATE TABLE detalle_entregas_nueva (
                    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_entrega INTEGER NOT NULL REFERENCES entregas(id_entrega) ON DELETE CASCADE,
                    id_llenado INTEGER REFERENCES llenados(id_llenado),
                    id_envase INTEGER NOT NULL REFERENCES envases(id_envase)
                )`);
                const list = db.prepare('PRAGMA table_info(detalle_entregas)').all().map(c => c.name).join(', ');
                db.exec(`INSERT INTO detalle_entregas_nueva (${list}) SELECT ${list} FROM detalle_entregas`);
                db.exec('DROP TABLE detalle_entregas');
                db.exec('ALTER TABLE detalle_entregas_nueva RENAME TO detalle_entregas');
            });
            txEntrega();
            db.exec('PRAGMA foreign_keys = ON');
            console.log('🔧 Migración aplicada: detalle_entregas.id_llenado opcional');
        }

        // Nueva: vista de guías con cantidad a llenar
        const vg = db.prepare("SELECT sql FROM sqlite_master WHERE type='view' AND name='vw_guias_despacho_completo'").get();
        if (vg && vg.sql && !vg.sql.includes('cantidad_llenado')) {
            db.exec('DROP VIEW IF EXISTS vw_guias_despacho_completo');
            db.exec(`CREATE VIEW vw_guias_despacho_completo AS
                SELECT g.*, dr.cantidad_llenado, e.codigo_interno, p.nombre as gas, cli.razon_social as cliente, pe.razon_social as planta_externa
                FROM guias_despacho g
                JOIN detalle_recepciones dr ON g.id_detalle_recepcion = dr.id_detalle
                JOIN envases e ON dr.id_envase = e.id_envase
                JOIN productos p ON e.id_producto = p.id_producto
                JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
                JOIN clientes cli ON r.id_cliente = cli.id_cliente
                LEFT JOIN plantas_externas pe ON g.id_planta_externa = pe.id_planta`);
            console.log('🔧 Migración aplicada: vw_guias_despacho_completo con cantidad_llenado');
        }

        // Ampliar CHECK de envases.estado (SQLite no permite ALTER de CHECK: se reconstruye la tabla)
        const envRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='envases'").get();
        if (envRow && envRow.sql && !envRow.sql.includes("'En planta externa'")) {
            const vistas = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='view'").all().filter(v => v.sql);
            db.exec('PRAGMA foreign_keys = OFF');
            const tx = db.transaction(() => {
                for (const v of vistas) db.exec('DROP VIEW IF EXISTS "' + v.name + '"');
                db.exec(`CREATE TABLE envases_nueva (
                    id_envase INTEGER PRIMARY KEY AUTOINCREMENT,
                    codigo_interno TEXT UNIQUE NOT NULL,
                    id_producto INTEGER NOT NULL REFERENCES productos(id_producto),
                    capacidad REAL,
                    propiedad TEXT NOT NULL CHECK (propiedad IN ('Propiedad_empresa','Propiedad_cliente','Tercero')),
                    id_propietario INTEGER REFERENCES clientes(id_cliente),
                    estado TEXT NOT NULL DEFAULT 'Disponible' CHECK (estado IN ('Disponible','Vacio','En llenado','Lleno','En reparacion','En bodega','Entregado','Baja','En planta externa','En OT local','Por entregar')),
                    observaciones_generales TEXT,
                    fecha_ultimo_llenado TEXT,
                    fecha_proxima_prueba TEXT,
                    tipo_llenado TEXT CHECK (tipo_llenado IN ('Local','Externo')),
                    id_planta_externa INTEGER REFERENCES plantas_externas(id_planta),
                    prueba_hidraulica TEXT DEFAULT 'Pendiente' CHECK (prueba_hidraulica IN ('Pendiente','Aprobado','Rechazado')),
                    fecha_prueba_hidraulica TEXT,
                    requiere_pintura INTEGER DEFAULT 0 CHECK (requiere_pintura IN (0,1)),
                    activo INTEGER DEFAULT 1 CHECK (activo IN (0,1)),
                    fecha_registro TEXT DEFAULT (datetime('now'))
                )`);
                const list = db.prepare('PRAGMA table_info(envases)').all().map(c => c.name).join(', ');
                db.exec(`INSERT INTO envases_nueva (${list}) SELECT ${list} FROM envases`);
                db.exec('DROP TABLE envases');
                db.exec('ALTER TABLE envases_nueva RENAME TO envases');
                db.exec('CREATE INDEX IF NOT EXISTS idx_envases_producto ON envases(id_producto)');
                db.exec('CREATE INDEX IF NOT EXISTS idx_envases_estado ON envases(estado)');
                db.exec('CREATE INDEX IF NOT EXISTS idx_envases_propietario ON envases(id_propietario)');
                for (const v of vistas) db.exec(v.sql);
            });
            tx();
            db.exec('PRAGMA foreign_keys = ON');
            console.log('🔧 Migración aplicada: CHECK ampliado en envases.estado');
        }

        // Certificados de baja: cilindros dados de baja por prueba hidráulica rechazada en local.
        const cbTabla = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='certificados_baja'").get();
        if (!cbTabla) {
            db.exec(`CREATE TABLE certificados_baja (
                id_certificado INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_certificado TEXT UNIQUE NOT NULL,
                id_envase INTEGER NOT NULL REFERENCES envases(id_envase),
                codigo_interno TEXT NOT NULL,
                gas_nombre TEXT,
                capacidad REAL,
                cliente_nombre TEXT,
                id_orden_trabajo INTEGER REFERENCES ordenes_trabajo(id_orden),
                id_detalle_recepcion INTEGER REFERENCES detalle_recepciones(id_detalle),
                id_responsable INTEGER REFERENCES trabajadores(id_trabajador),
                responsable_nombre TEXT,
                responsable_cargo TEXT,
                glosa TEXT NOT NULL,
                fecha TEXT DEFAULT (datetime('now'))
            )`);
            db.exec('CREATE INDEX IF NOT EXISTS idx_certbaja_envase ON certificados_baja(id_envase)');
            db.exec('CREATE INDEX IF NOT EXISTS idx_certbaja_ot ON certificados_baja(id_orden_trabajo)');
            console.log('🔧 Migración aplicada: tabla certificados_baja');
        }

        // Vista de guías: incluir los trabajos realizados y la cantidad llenada (recepción desde planta externa).
        // Se recrea siempre (idempotente) para que bases existentes adopten la nueva definición.
        db.exec('DROP VIEW IF EXISTS vw_guias_despacho_completo');
        db.exec(`CREATE VIEW vw_guias_despacho_completo AS
            SELECT g.*, dr.cantidad_llenado, e.codigo_interno, p.nombre as gas, cli.razon_social as cliente,
                   pe.razon_social as planta_externa, ll.cantidad as cantidad_llenada
            FROM guias_despacho g
            JOIN detalle_recepciones dr ON g.id_detalle_recepcion = dr.id_detalle
            JOIN envases e ON dr.id_envase = e.id_envase
            JOIN productos p ON e.id_producto = p.id_producto
            JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
            JOIN clientes cli ON r.id_cliente = cli.id_cliente
            LEFT JOIN plantas_externas pe ON g.id_planta_externa = pe.id_planta
            LEFT JOIN llenados ll ON ll.id_detalle_recepcion = g.id_detalle_recepcion
               AND ll.id_llenado = (SELECT MAX(l3.id_llenado) FROM llenados l3 WHERE l3.id_detalle_recepcion = g.id_detalle_recepcion)`);
        console.log('🔧 Migración aplicada: vw_guias_despacho_completo (trabajos + cantidad llenada)');
    } catch (err) {
        console.error('❌ Error en migraciones:', err.message);
    }
}
runMigrations();

// API compatible con pg
module.exports = {
    // query(sql, params) -> Promise<{rows: []}>
    query: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            try {
                // Detectar si es SELECT
                const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
                const isInsertReturning = sql.includes('RETURNING');
                
                if (isSelect) {
                    const stmt = db.prepare(sql);
                    const rows = params.length ? stmt.all(...params) : stmt.all();
                    resolve(wrapRows(rows));
                } else if (isInsertReturning) {
                    const stmt = db.prepare(sql);
                    const result = params.length ? stmt.run(...params) : stmt.run();
                    // Obtener el registro insertado
                    const row = db.prepare(`SELECT * FROM ${sql.match(/INTO\s+(\w+)/i)?.[1] || ''} WHERE rowid = ?`).get(result.lastInsertRowid);
                    resolve(wrapRow(row));
                } else {
                    const stmt = db.prepare(sql);
                    const result = params.length ? stmt.run(...params) : stmt.run();
                    resolve({ 
                        rows: [], 
                        rowCount: result.changes,
                        lastInsertRowid: result.lastInsertRowid 
                    });
                }
            } catch (err) {
                reject(err);
            }
        });
    },

    // Para transacciones
    getClient: () => {
        return {
            query: (sql, params) => module.exports.query(sql, params),
            release: () => {}
        };
    },

    // Acceso directo a la instancia para casos especiales
    _db: db,

    // Helpers
    exec: (sql) => db.exec(sql),
    prepare: (sql) => db.prepare(sql),
    transaction: (fn) => db.transaction(fn),
    close: () => db.close()
};