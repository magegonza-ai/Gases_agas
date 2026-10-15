-- PROMINER - SQLite Schema v2.1
-- Migración desde PostgreSQL
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- Limpiar tablas existentes (orden inverso por FK)
DROP TABLE IF EXISTS certificados_baja;
DROP TABLE IF EXISTS detalle_transacciones;
DROP TABLE IF EXISTS transacciones;
DROP TABLE IF EXISTS guias_despacho;
DROP TABLE IF EXISTS plantas_externas;
DROP TABLE IF EXISTS detalle_entregas;
DROP TABLE IF EXISTS entregas;
DROP TABLE IF EXISTS llenados;
DROP TABLE IF EXISTS ordenes_trabajo;
DROP TABLE IF EXISTS detalle_recepciones;
DROP TABLE IF EXISTS recepciones;
DROP TABLE IF EXISTS envase_observaciones;
DROP TABLE IF EXISTS envases;
DROP TABLE IF EXISTS trabajador_cargos;
DROP TABLE IF EXISTS cargos;
DROP TABLE IF EXISTS trabajadores;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS clientes;

-- ============================================
-- TABLAS BASE
-- ============================================
CREATE TABLE clientes (
    id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social TEXT NOT NULL,
    rut TEXT UNIQUE NOT NULL,
    direccion TEXT,
    comuna TEXT,
    telefono TEXT,
    email TEXT,
    fecha_registro TEXT DEFAULT (datetime('now')),
    activo INTEGER DEFAULT 1 CHECK (activo IN (0,1))
);

CREATE TABLE trabajadores (
    id_trabajador INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    activo INTEGER DEFAULT 1 CHECK (activo IN (0,1)),
    fecha_registro TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cargos (
    id_cargo INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE trabajador_cargos (
    id_trabajador INTEGER NOT NULL REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    id_cargo INTEGER NOT NULL REFERENCES cargos(id_cargo),
    PRIMARY KEY (id_trabajador, id_cargo)
);

CREATE TABLE productos (
    id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidad_medida TEXT NOT NULL CHECK (unidad_medida IN ('M3','Kilos','Litros')),
    precio_unitario REAL,
    stock_disponible REAL DEFAULT 0,
    stock_minimo REAL DEFAULT 0,
    activo INTEGER DEFAULT 1 CHECK (activo IN (0,1))
);

CREATE TABLE envases (
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
    -- Campos para flujo de llenado
    tipo_llenado TEXT CHECK (tipo_llenado IN ('Local','Externo')),
    id_planta_externa INTEGER REFERENCES plantas_externas(id_planta),
    prueba_hidraulica TEXT DEFAULT 'Pendiente' CHECK (prueba_hidraulica IN ('Pendiente','Aprobado','Rechazado')),
    fecha_prueba_hidraulica TEXT,
    requiere_pintura INTEGER DEFAULT 0 CHECK (requiere_pintura IN (0,1)),
    activo INTEGER DEFAULT 1 CHECK (activo IN (0,1)),
    fecha_registro TEXT DEFAULT (datetime('now'))
);

CREATE TABLE envase_observaciones (
    id_observacion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_envase INTEGER NOT NULL REFERENCES envases(id_envase),
    id_trabajador INTEGER NOT NULL REFERENCES trabajadores(id_trabajador),
    fecha TEXT DEFAULT (datetime('now')),
    tipo TEXT NOT NULL CHECK (tipo IN ('Dano','Reparacion','Mantenimiento','General')),
    descripcion TEXT NOT NULL
);

CREATE TABLE recepciones (
    id_recepcion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente),
    id_recepcionista INTEGER NOT NULL REFERENCES trabajadores(id_trabajador),
    fecha_recepcion TEXT DEFAULT (datetime('now')),
    numero_comprobante TEXT UNIQUE NOT NULL,
    observaciones TEXT,
    estado TEXT DEFAULT 'Abierta' CHECK (estado IN ('Abierta','Cerrada','Cancelada'))
);

CREATE TABLE detalle_recepciones (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_recepcion INTEGER NOT NULL REFERENCES recepciones(id_recepcion) ON DELETE CASCADE,
    id_envase INTEGER NOT NULL REFERENCES envases(id_envase),
    gas_solicitado INTEGER NOT NULL REFERENCES productos(id_producto),
    cantidad_llenado REAL,
    estado_recibido TEXT NOT NULL,
    requiere_reparacion INTEGER DEFAULT 0 CHECK (requiere_reparacion IN (0,1)),
    observaciones TEXT,
    procesado INTEGER DEFAULT 0 CHECK (procesado IN (0,1)),
    prueba_hidraulica TEXT DEFAULT 'Pendiente' CHECK (prueba_hidraulica IN ('Pendiente','Aprobado','Rechazado')),
    requiere_pintura INTEGER DEFAULT 0 CHECK (requiere_pintura IN (0,1)),
    tipo_llenado TEXT DEFAULT 'Local' CHECK (tipo_llenado IN ('Local','Externo')),
    id_planta_externa INTEGER REFERENCES plantas_externas(id_planta)
);

CREATE TABLE ordenes_trabajo (
    id_orden INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_orden TEXT,
    id_detalle_recepcion INTEGER NOT NULL REFERENCES detalle_recepciones(id_detalle),
    id_envase INTEGER NOT NULL REFERENCES envases(id_envase),
    tipo_trabajo TEXT NOT NULL CHECK (tipo_trabajo IN ('Prueba hidraulica','Reparacion de valvula','Pintura/Identificacion','Soldadura/Parche')),
    prioridad TEXT DEFAULT 'Normal' CHECK (prioridad IN ('Alta','Normal','Baja')),
    id_asignado INTEGER REFERENCES trabajadores(id_trabajador),
    estado TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','En proceso','Completada','Cancelada')),
    descripcion_trabajo TEXT,
    registro_horario TEXT,
    resultado TEXT,
    repuestos TEXT,
    tiempo_invertido INTEGER,
    fecha_creacion TEXT DEFAULT (datetime('now')),
    fecha_inicio TEXT,
    fecha_cierre TEXT,
    -- Campos adicionales
    requiere_prueba_hidraulica INTEGER DEFAULT 0 CHECK (requiere_prueba_hidraulica IN (0,1)),
    requiere_pintura INTEGER DEFAULT 0 CHECK (requiere_pintura IN (0,1)),
    prueba_hidraulica_resultado TEXT CHECK (prueba_hidraulica_resultado IN ('Aprobado','Rechazado')),
    pintura_realizada INTEGER DEFAULT 0 CHECK (pintura_realizada IN (0,1)),
    fecha_entrega_estimada TEXT
);

-- Certificado de baja: se emite cuando la prueba hidráulica local resulta RECHAZADA.
-- Guarda una copia (snapshot) de los datos para que el documento sea autocontenido.
CREATE TABLE certificados_baja (
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
);

CREATE TABLE llenados (
    id_llenado INTEGER PRIMARY KEY AUTOINCREMENT,
    id_detalle_recepcion INTEGER NOT NULL REFERENCES detalle_recepciones(id_detalle),
    id_envase INTEGER NOT NULL REFERENCES envases(id_envase),
    id_llenador INTEGER NOT NULL REFERENCES trabajadores(id_trabajador),
    gas_llenado INTEGER NOT NULL REFERENCES productos(id_producto),
    cantidad REAL NOT NULL,
    fecha_llenado TEXT DEFAULT (datetime('now')),
    destino TEXT NOT NULL CHECK (destino IN ('Retiro inmediato','Bodega temporal')),
    id_planta_externa INTEGER REFERENCES plantas_externas(id_planta),
    prueba_hidraulica_resultado TEXT
);

CREATE TABLE entregas (
    id_entrega INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente),
    id_despachador INTEGER NOT NULL REFERENCES trabajadores(id_trabajador),
    fecha_entrega TEXT DEFAULT (datetime('now')),
    numero_documento TEXT UNIQUE NOT NULL,
    tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('Vale','Factura','Boleta')),
    patente_vehiculo TEXT,
    firma_cliente TEXT,
    observaciones TEXT
);

CREATE TABLE detalle_entregas (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_entrega INTEGER NOT NULL REFERENCES entregas(id_entrega) ON DELETE CASCADE,
    id_llenado INTEGER REFERENCES llenados(id_llenado),
    id_envase INTEGER NOT NULL REFERENCES envases(id_envase)
);

-- ============================================
-- TABLAS ADICIONALES
-- ============================================
CREATE TABLE plantas_externas (
    id_planta INTEGER PRIMARY KEY AUTOINCREMENT,
    rut TEXT UNIQUE NOT NULL,
    razon_social TEXT NOT NULL,
    direccion TEXT,
    persona_contacto TEXT,
    telefono TEXT,
    email TEXT,
    activa INTEGER DEFAULT 1 CHECK (activa IN (0,1))
);

CREATE TABLE guias_despacho (
    id_guia INTEGER PRIMARY KEY AUTOINCREMENT,
    id_detalle_recepcion INTEGER NOT NULL REFERENCES detalle_recepciones(id_detalle),
    id_planta_externa INTEGER NOT NULL REFERENCES plantas_externas(id_planta),
    numero_guia TEXT UNIQUE NOT NULL,
    chofer TEXT,
    patente_vehiculo TEXT,
    observaciones TEXT,
    estado TEXT DEFAULT 'Enviada' CHECK (estado IN ('Enviada','Recibida','Devuelta','Cancelada')),
    prueba_hidraulica_resultado TEXT CHECK (prueba_hidraulica_resultado IN ('Aprobado','Rechazado')),
    trabajos_realizados TEXT,
    fecha_envio TEXT DEFAULT (datetime('now')),
    fecha_recepcion_planta TEXT,
    fecha_retorno TEXT
);

CREATE TABLE transacciones (
    id_transaccion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente),
    numero_documento TEXT UNIQUE NOT NULL,
    tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('Vale','Factura','Boleta')),
    patente_vehiculo TEXT,
    preparado_por TEXT,
    observaciones TEXT,
    estado TEXT DEFAULT 'Activa' CHECK (estado IN ('Activa','Anulada')),
    fecha TEXT DEFAULT (datetime('now'))
);

CREATE TABLE detalle_transacciones (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_transaccion INTEGER NOT NULL REFERENCES transacciones(id_transaccion) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto),
    cantidad REAL NOT NULL,
    cantidad_envases INTEGER DEFAULT 1,
    tipo_operacion TEXT NOT NULL CHECK (tipo_operacion IN ('Venta','Devolucion','Ajuste')),
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_envases_producto ON envases(id_producto);
CREATE INDEX idx_envases_estado ON envases(estado);
CREATE INDEX idx_envases_propietario ON envases(id_propietario);
CREATE INDEX idx_obs_envase ON envase_observaciones(id_envase);
CREATE INDEX idx_recepcion_cliente ON recepciones(id_cliente);
CREATE INDEX idx_detalle_recepcion ON detalle_recepciones(id_recepcion);
CREATE INDEX idx_detalle_envase ON detalle_recepciones(id_envase);
CREATE INDEX idx_ot_envase ON ordenes_trabajo(id_envase);
CREATE INDEX idx_ot_estado ON ordenes_trabajo(estado);
CREATE INDEX idx_llenado_envase ON llenados(id_envase);
CREATE INDEX idx_entrega_cliente ON entregas(id_cliente);
CREATE INDEX idx_certbaja_envase ON certificados_baja(id_envase);
CREATE INDEX idx_certbaja_ot ON certificados_baja(id_orden_trabajo);
CREATE INDEX idx_guia_detalle ON guias_despacho(id_detalle_recepcion);
CREATE INDEX idx_guia_planta ON guias_despacho(id_planta_externa);
CREATE INDEX idx_guia_estado ON guias_despacho(estado);
CREATE INDEX idx_transaccion_cliente ON transacciones(id_cliente);
CREATE INDEX idx_transaccion_fecha ON transacciones(fecha);

-- ============================================
-- DATOS INICIALES
-- ============================================
INSERT INTO productos (nombre, descripcion, unidad_medida, precio_unitario, stock_disponible, stock_minimo) VALUES
('Oxigeno', 'Oxigeno medicinal/industrial', 'M3', 2500.00, 5000.00, 500.00),
('Acetileno', 'Gas para soldadura', 'M3', 3200.00, 2000.00, 300.00),
('Nitrogeno', 'Nitrogeno industrial', 'M3', 1800.00, 4000.00, 400.00),
('Argon', 'Argon para soldadura TIG', 'M3', 2800.00, 3000.00, 300.00),
('CO2', 'Dioxido de carbono', 'M3', 1500.00, 2500.00, 250.00),
('N2O', 'Oxido nitroso', 'M3', 4000.00, 1000.00, 100.00),
('Mezcla', 'Mezcla especial', 'M3', 5000.00, 800.00, 100.00);

INSERT INTO clientes (razon_social, rut, direccion, comuna, telefono, email) VALUES
('Constructora Ejemplo S.A.', '76.123.456-7', 'Av. Industrial 1234', 'Santiago', '+56912345678', 'contacto@ejemplo.cl'),
('Hospital Regional', '80.987.654-3', 'Av. Salud 567', 'Providencia', '+56987654321', 'logistica@hospital.cl'),
('Taller Mecanico Los Andes', '99.111.222-3', 'Calle Maquinaria 89', 'Quilicura', '+56911223344', 'taller@andes.cl');

INSERT INTO trabajadores (nombre, telefono) VALUES
('Carlos Martinez', '+56911111111'),
('Ana Rodriguez', '+56922222222'),
('Pedro Sanchez', '+56933333333'),
('Maria Lopez', '+56944444444'),
('Jorge Torres', '+56955555555');

INSERT INTO cargos (nombre) VALUES
('Recepcionista'),
('Llenador'),
('Despachador'),
('Jefe de planta'),
('Especialista');

INSERT INTO trabajador_cargos (id_trabajador, id_cargo) VALUES
(1, 1), -- Carlos -> Recepcionista
(2, 2), -- Ana -> Llenador
(3, 3), -- Pedro -> Despachador
(4, 4), -- Maria -> Jefe de planta
(5, 5); -- Jorge -> Especialista

INSERT INTO envases (codigo_interno, id_producto, capacidad, propiedad, id_propietario, estado) VALUES
('CIL-001', 1, 50, 'Propiedad_cliente', 1, 'Disponible'),
('CIL-002', 1, 50, 'Propiedad_cliente', 1, 'Vacio'),
('CIL-003', 2, 40, 'Propiedad_empresa', NULL, 'Disponible'),
('CIL-004', 3, 50, 'Propiedad_cliente', 2, 'En reparacion'),
('CIL-005', 4, 30, 'Tercero', 3, 'Lleno'),
('CIL-006', 1, 50, 'Propiedad_empresa', NULL, 'En bodega'),
('CIL-007', 5, 25, 'Propiedad_cliente', 1, 'Disponible');

-- DATOS INICIALES: Plantas Externas
INSERT INTO plantas_externas (rut, razon_social, direccion, persona_contacto, telefono, email) VALUES
('77.111.222-3', 'Planta Industrial Norte', 'Av. Industrial 5000', 'Juan Perez', '+56987654321', 'contacto@plantanorte.cl'),
('77.222.333-4', 'Planta Sur Gases', 'Calle Quimica 123', 'Maria Gonzalez', '+56912345678', 'ventas@plantasur.cl');

-- ============================================
-- VISTAS (SQLite usa GROUP_CONCAT en vez de STRING_AGG)
-- ============================================
CREATE VIEW vw_envases_completo AS
SELECT e.id_envase, e.codigo_interno, p.nombre AS gas, e.capacidad, e.propiedad,
       c.razon_social AS propietario, e.estado, e.fecha_ultimo_llenado, e.fecha_proxima_prueba
FROM envases e
JOIN productos p ON e.id_producto = p.id_producto
LEFT JOIN clientes c ON e.id_propietario = c.id_cliente;

CREATE VIEW vw_stock_alertas AS
SELECT id_producto, nombre, stock_disponible, stock_minimo,
       CASE WHEN stock_disponible <= stock_minimo THEN 'CRITICO' ELSE 'OK' END AS estado_stock
FROM productos WHERE activo = 1;

CREATE VIEW vw_trabajadores_cargos AS
SELECT t.id_trabajador, t.nombre, t.telefono, t.activo, t.fecha_registro,
       GROUP_CONCAT(c.nombre, ', ') AS cargos
FROM trabajadores t
LEFT JOIN trabajador_cargos tc ON t.id_trabajador = tc.id_trabajador
LEFT JOIN cargos c ON tc.id_cargo = c.id_cargo
WHERE t.activo = 1
GROUP BY t.id_trabajador, t.nombre, t.telefono, t.activo, t.fecha_registro;

-- ============================================
-- VISTAS ADICIONALES
-- ============================================
CREATE VIEW vw_guias_despacho_completo AS
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
   AND ll.id_llenado = (SELECT MAX(l3.id_llenado) FROM llenados l3 WHERE l3.id_detalle_recepcion = g.id_detalle_recepcion);

CREATE VIEW vw_cilindros_llenado AS
SELECT e.*, p.nombre as gas
FROM envases e
JOIN productos p ON e.id_producto = p.id_producto
WHERE e.estado IN ('Vacio', 'En llenado', 'En OT local', 'Por entregar', 'En planta externa');

CREATE VIEW vw_cilindros_pendientes_entrega AS
SELECT e.*, p.nombre as gas
FROM envases e
JOIN productos p ON e.id_producto = p.id_producto
WHERE e.estado IN ('Lleno', 'En bodega', 'Por entregar', 'En planta externa', 'En OT local');

-- Trigger para updated_at (opcional)
CREATE TRIGGER trg_clientes_updated
AFTER UPDATE ON clientes
BEGIN
    UPDATE clientes SET fecha_registro = datetime('now') WHERE id_cliente = NEW.id_cliente;
END;