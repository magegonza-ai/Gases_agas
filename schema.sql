-- =====================================================
-- SISTEMA DE CONTROL DE ENVASES - GASAGAS
-- Base de datos: PostgreSQL
-- =====================================================

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS detalle_transacciones CASCADE;
DROP TABLE IF EXISTS transacciones CASCADE;
DROP TABLE IF EXISTS envases CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- =====================================================
-- TABLA: CLIENTES
-- Almacena información de empresas/personas
-- =====================================================
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,
    razon_social VARCHAR(150) NOT NULL,
    rut VARCHAR(20) UNIQUE NOT NULL,
    direccion VARCHAR(200),
    comuna VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- TABLA: PRODUCTOS (Gases)
-- Catálogo de gases disponibles
-- =====================================================
CREATE TABLE productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    unidad_medida VARCHAR(20) NOT NULL, -- 'M3', 'Kilos', 'Litros'
    precio_unitario DECIMAL(10,2),
    activo BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- TABLA: ENVASES (Inventario de Cilindros)
-- Control del parque de botellas
-- =====================================================
CREATE TABLE envases (
    id_envase SERIAL PRIMARY KEY,
    codigo_interno VARCHAR(50) UNIQUE NOT NULL, -- Código único del cilindro
    id_producto INTEGER REFERENCES productos(id_producto),
    propiedad VARCHAR(20) CHECK (propiedad IN ('Propiedad', 'Cliente')),
    estado VARCHAR(20) CHECK (estado IN ('Lleno', 'Vacío', 'En mantenimiento', 'Baja')),
    id_cliente_actual INTEGER REFERENCES clientes(id_cliente),
    fecha_ultimo_llenado TIMESTAMP,
    fecha_proxima_recarga DATE,
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- TABLA: TRANSACCIONES (Cabecera del Vale/Factura)
-- Registra cada operación de llenado/retiro
-- =====================================================
CREATE TABLE transacciones (
    id_transaccion SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    numero_documento VARCHAR(50) UNIQUE NOT NULL, -- Nº de Vale o Factura
    tipo_documento VARCHAR(20) CHECK (tipo_documento IN ('Vale', 'Factura', 'Boleta')),
    patente_vehiculo VARCHAR(10),
    preparado_por VARCHAR(100), -- Empleado que realiza la operación
    firma_cliente VARCHAR(100),
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Anulada', 'Completada'))
);

-- =====================================================
-- TABLA: DETALLE_TRANSACCIONES
-- Ítems específicos de cada transacción
-- =====================================================
CREATE TABLE detalle_transacciones (
    id_detalle SERIAL PRIMARY KEY,
    id_transaccion INTEGER NOT NULL REFERENCES transacciones(id_transaccion) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto),
    cantidad DECIMAL(10,2) NOT NULL, -- Volumen o peso entregado
    cantidad_envases INTEGER DEFAULT 1, -- Número de cilindros
    tipo_operacion VARCHAR(20) CHECK (tipo_operacion IN ('Llenado', 'Retiro', 'Devolución')),
    precio_unitario DECIMAL(10,2),
    subtotal DECIMAL(10,2)
);

-- =====================================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================
CREATE INDEX idx_envases_cliente ON envases(id_cliente_actual);
CREATE INDEX idx_envases_estado ON envases(estado);
CREATE INDEX idx_envases_producto ON envases(id_producto);
CREATE INDEX idx_transacciones_cliente ON transacciones(id_cliente);
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha);
CREATE INDEX idx_detalle_transaccion ON detalle_transacciones(id_transaccion);

-- =====================================================
-- DATOS INICIALES (Opcional)
-- =====================================================

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, descripcion, unidad_medida, precio_unitario) VALUES
('Oxígeno', 'Oxígeno medicinal/industrial', 'M3', 2500.00),
('Acetileno', 'Gas para soldadura', 'M3', 3200.00),
('Nitrógeno', 'Nitrógeno industrial', 'M3', 1800.00),
('Argon', 'Argon para soldadura TIG', 'M3', 2800.00),
('CO2', 'Dióxido de carbono', 'M3', 1500.00),
('N2O', 'Óxido nitroso', 'M3', 4000.00),
('Mezcla', 'Mezcla especial', 'M3', 5000.00);

-- Insertar cliente de ejemplo
INSERT INTO clientes (razon_social, rut, direccion, comuna, telefono, email) VALUES
('Constructora Ejemplo S.A.', '76.123.456-7', 'Av. Industrial 1234', 'Santiago', '+56912345678', 'contacto@ejemplo.cl');

-- Insertar envases de ejemplo
INSERT INTO envases (codigo_interno, id_producto, propiedad, estado, id_cliente_actual) VALUES
('CIL-001', 1, 'Propiedad', 'Lleno', 1),
('CIL-002', 1, 'Propiedad', 'Vacío', 1),
('CIL-003', 2, 'Cliente', 'Lleno', 1),
('CIL-004', 3, 'Propiedad', 'En mantenimiento', NULL);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista para ver envases con información completa
CREATE VIEW vw_envases_completo AS
SELECT 
    e.id_envase,
    e.codigo_interno,
    p.nombre AS gas,
    e.propiedad,
    e.estado,
    c.razon_social AS cliente,
    e.fecha_ultimo_llenado,
    e.fecha_proxima_recarga
FROM envases e
JOIN productos p ON e.id_producto = p.id_producto
LEFT JOIN clientes c ON e.id_cliente_actual = c.id_cliente;

-- Vista para ver transacciones resumidas
CREATE VIEW vw_transacciones_resumen AS
SELECT 
    t.id_transaccion,
    t.numero_documento,
    t.fecha,
    c.razon_social AS cliente,
    c.rut,
    t.patente_vehiculo,
    t.preparado_por,
    t.estado,
    COUNT(d.id_detalle) AS total_items
FROM transacciones t
JOIN clientes c ON t.id_cliente = c.id_cliente
LEFT JOIN detalle_transacciones d ON t.id_transaccion = d.id_transaccion
GROUP BY t.id_transaccion, t.numero_documento, t.fecha, c.razon_social, c.rut, t.patente_vehiculo, t.preparado_por, t.estado;

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
