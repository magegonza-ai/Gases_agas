-- MIGRACIÓN PROMINER v3.0 - Nuevo flujo de llenado externo/local + prueba hidráulica + OT local + Guías
-- Fecha: 2026-10-10

-- 1. TABLA PLANTAS EXTERNAS
CREATE TABLE IF NOT EXISTS plantas_externas (
    id_planta SERIAL PRIMARY KEY,
    rut VARCHAR(20) UNIQUE NOT NULL,
    razon_social VARCHAR(150) NOT NULL,
    direccion VARCHAR(200),
    persona_contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    activa BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MODIFICAR ENVASES - nuevos campos
ALTER TABLE envases 
ADD COLUMN IF NOT EXISTS tipo_llenado VARCHAR(20) CHECK (tipo_llenado IN ('Local','Externo')),
ADD COLUMN IF NOT EXISTS id_planta_externa INTEGER REFERENCES plantas_externas(id_planta),
ADD COLUMN IF NOT EXISTS prueba_hidraulica VARCHAR(20) CHECK (prueba_hidraulica IN ('Aprobado','Rechazado','Pendiente')) DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS fecha_prueba_hidraulica TIMESTAMP,
ADD COLUMN IF NOT EXISTS requiere_pintura BOOLEAN DEFAULT FALSE;

-- 3. NUEVOS ESTADOS EN ENVASES
ALTER TABLE envases 
DROP CONSTRAINT IF EXISTS envases_estado_check;

ALTER TABLE envases 
ADD CONSTRAINT envases_estado_check CHECK (estado IN (
    'Disponible','Vacio','En llenado','Lleno','En reparacion',
    'En bodega','Entregado','Baja',
    'En planta externa','En OT local','Por entregar'
));

-- 4. MODIFICAR DETALLE_RECEPCIONES - datos de recepción
ALTER TABLE detalle_recepciones
ADD COLUMN IF NOT EXISTS prueba_hidraulica VARCHAR(20) CHECK (prueba_hidraulica IN ('Aprobado','Rechazado','Pendiente')) DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS requiere_pintura BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tipo_llenado VARCHAR(20) CHECK (tipo_llenado IN ('Local','Externo')),
ADD COLUMN IF NOT EXISTS id_planta_externa INTEGER REFERENCES plantas_externas(id_planta);

-- 5. TABLA GUÍAS DE DESPACHO (envío a planta externa)
CREATE TABLE IF NOT EXISTS guias_despacho (
    id_guia SERIAL PRIMARY KEY,
    id_detalle_recepcion INTEGER NOT NULL REFERENCES detalle_recepciones(id_detalle),
    id_planta_externa INTEGER NOT NULL REFERENCES plantas_externas(id_planta),
    numero_guia VARCHAR(50) UNIQUE NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    chofer VARCHAR(100),
    patente_vehiculo VARCHAR(10),
    observaciones TEXT,
    prueba_hidraulica_resultado VARCHAR(20) CHECK (prueba_hidraulica_resultado IN ('Aprobado','Rechazado')),
    estado VARCHAR(20) DEFAULT 'Enviada' CHECK (estado IN ('Enviada','Recibida','Devuelta','Cancelada')),
    fecha_recepcion_planta TIMESTAMP,
    fecha_retorno TIMESTAMP
);

-- 6. MODIFICAR ORDENES_TRABAJO - solo local, tipos específicos
ALTER TABLE ordenes_trabajo
DROP CONSTRAINT IF EXISTS ordenes_trabajo_tipo_trabajo_check;

ALTER TABLE ordenes_trabajo
ADD COLUMN IF NOT EXISTS requiere_prueba_hidraulica BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requiere_pintura BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_entrega_estimada DATE;

-- Actualizar constraint tipo_trabajo
ALTER TABLE ordenes_trabajo
ADD CONSTRAINT ordenes_trabajo_tipo_trabajo_check CHECK (tipo_trabajo IN (
    'Prueba hidraulica','Reparacion de valvula','Pintura/Identificacion','Soldadura/Parche'
));

-- 7. MODIFICAR LLENADOS - tracking planta externa
ALTER TABLE llenados
ADD COLUMN IF NOT EXISTS id_planta_externa INTEGER REFERENCES plantas_externas(id_planta),
ADD COLUMN IF NOT EXISTS prueba_hidraulica_resultado VARCHAR(20) CHECK (prueba_hidraulica_resultado IN ('Aprobado','Rechazado'));

-- 8. INSERTAR PLANTAS EXTERNAS DE EJEMPLO
INSERT INTO plantas_externas (rut, razon_social, direccion, persona_contacto, telefono, email) VALUES
('76.111.222-3', 'Planta Llenado Norte S.A.', 'Av. Industrial 5000, Huechuraba', 'Juan Pérez', '+56988881111', 'contacto@plantanorte.cl'),
('76.333.444-5', 'GasAndes SpA', 'Camino Lo Boza 1200, Maipú', 'María González', '+56977772222', 'operaciones@gasandes.cl'),
('76.555.666-7', 'Industrial Gases Sur Ltda.', 'Av. Las Industrias 300, San Bernardo', 'Carlos Rojas', '+56966663333', 'ventas@industrialgas.cl')
ON CONFLICT (rut) DO NOTHING;

-- 9. VISTA: Cilindros con info completa para llenado
CREATE OR REPLACE VIEW vw_cilindros_llenado AS
SELECT 
    e.id_envase, e.codigo_interno, p.nombre AS gas, e.capacidad, e.propiedad,
    c.razon_social AS propietario, e.estado, e.tipo_llenado,
    pe.razon_social AS planta_externa,
    e.prueba_hidraulica, e.fecha_prueba_hidraulica, e.requiere_pintura,
    dr.prueba_hidraulica AS prueba_hidraulica_recepcion,
    dr.requiere_pintura AS requiere_pintura_recepcion,
    dr.tipo_llenado AS tipo_llenado_recepcion,
    dr.id_planta_externa AS id_planta_recepcion
FROM envases e
JOIN productos p ON e.id_producto = p.id_producto
LEFT JOIN clientes c ON e.id_propietario = c.id_cliente
LEFT JOIN plantas_externas pe ON e.id_planta_externa = pe.id_planta
LEFT JOIN detalle_recepciones dr ON e.id_envase = dr.id_envase
WHERE e.activo = TRUE;

-- 10. VISTA: Guías de despacho con detalle
CREATE OR REPLACE VIEW vw_guias_despacho_completo AS
SELECT 
    g.id_guia, g.numero_guia, g.fecha_envio, g.chofer, g.patente_vehiculo,
    g.observaciones, g.prueba_hidraulica_resultado, g.estado,
    g.fecha_recepcion_planta, g.fecha_retorno,
    pe.razon_social AS planta_externa, pe.rut AS planta_rut, pe.direccion AS planta_direccion,
    dr.id_detalle, e.codigo_interno, p.nombre AS gas,
    cli.razon_social AS cliente, cli.rut AS cliente_rut
FROM guias_despacho g
JOIN plantas_externas pe ON g.id_planta_externa = pe.id_planta
JOIN detalle_recepciones dr ON g.id_detalle_recepcion = dr.id_detalle
JOIN envases e ON dr.id_envase = e.id_envase
JOIN productos p ON e.id_producto = p.id_producto
JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
JOIN clientes cli ON r.id_cliente = cli.id_cliente;

-- 11. VISTA: Cilindros pendientes de entrega (para dashboard)
CREATE OR REPLACE VIEW vw_cilindros_pendientes_entrega AS
SELECT 
    e.id_envase, e.codigo_interno, p.nombre AS gas, e.estado, e.tipo_llenado,
    pe.razon_social AS planta_externa,
    cli.razon_social AS cliente, cli.rut AS cliente_rut,
    r.fecha_recepcion,
    dr.prueba_hidraulica, dr.requiere_pintura,
    CASE 
        WHEN e.estado = 'En planta externa' THEN 'En llenado externo'
        WHEN e.estado = 'En OT local' THEN 'En reparación/pintura local'
        WHEN e.estado = 'Por entregar' THEN 'Listo para despacho'
        ELSE e.estado
    END AS situacion
FROM envases e
JOIN productos p ON e.id_producto = p.id_producto
LEFT JOIN plantas_externas pe ON e.id_planta_externa = pe.id_planta
LEFT JOIN detalle_recepciones dr ON e.id_envase = dr.id_envase
LEFT JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
LEFT JOIN clientes cli ON r.id_cliente = cli.id_cliente
WHERE e.estado IN ('En planta externa','En OT local','Por entregar','Lleno','En bodega')
  AND e.activo = TRUE
ORDER BY r.fecha_recepcion;

-- 12. VISTA: OTs locales con info de entrega estimada
CREATE OR REPLACE VIEW vw_ot_locales AS
SELECT 
    ot.id_orden, ot.tipo_trabajo, ot.prioridad, ot.estado,
    ot.requiere_prueba_hidraulica, ot.requiere_pintura, ot.fecha_entrega_estimada,
    ot.fecha_creacion, ot.fecha_inicio, ot.fecha_cierre,
    e.codigo_interno, p.nombre AS gas, e.estado AS estado_cilindro,
    cli.razon_social AS cliente,
    t.nombre AS asignado_nombre
FROM ordenes_trabajo ot
JOIN envases e ON ot.id_envase = e.id_envase
JOIN productos p ON e.id_producto = p.id_producto
JOIN detalle_recepciones dr ON ot.id_detalle_recepcion = dr.id_detalle
JOIN recepciones r ON dr.id_recepcion = r.id_recepcion
JOIN clientes cli ON r.id_cliente = cli.id_cliente
LEFT JOIN trabajadores t ON ot.id_asignado = t.id_trabajador
WHERE ot.requiere_prueba_hidraulica = TRUE OR ot.requiere_pintura = TRUE
ORDER BY ot.fecha_entrega_estimada NULLS LAST, ot.prioridad DESC;