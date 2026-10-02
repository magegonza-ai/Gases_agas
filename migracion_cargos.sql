-- MIGRACION: Trabajadores con multiples cargos
-- Fecha: 2026-08-22

-- 1. Crear tabla de cargos
CREATE TABLE IF NOT EXISTS cargos (
    id_cargo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Crear tabla intermedia
CREATE TABLE IF NOT EXISTS trabajador_cargos (
    id_trabajador INTEGER NOT NULL REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    id_cargo INTEGER NOT NULL REFERENCES cargos(id_cargo),
    PRIMARY KEY (id_trabajador, id_cargo)
);

-- 3. Insertar cargos base
INSERT INTO cargos (nombre) VALUES
    ('Recepcionista'),
    ('Llenador'),
    ('Despachador'),
    ('Jefe de planta'),
    ('Especialista')
ON CONFLICT (nombre) DO NOTHING;

-- 4. Migrar datos existentes del campo cargo unico a la tabla intermedia
INSERT INTO trabajador_cargos (id_trabajador, id_cargo)
SELECT t.id_trabajador, c.id_cargo
FROM trabajadores t
JOIN cargos c ON c.nombre = t.cargo
ON CONFLICT DO NOTHING;

-- 5. Eliminar la columna cargo de trabajadores (ya no se usa)
ALTER TABLE trabajadores DROP COLUMN IF EXISTS cargo;

-- 6. Vista actualizada de trabajadores con sus cargos
CREATE OR REPLACE VIEW vw_trabajadores_cargos AS
SELECT t.id_trabajador, t.nombre, t.telefono, t.activo, t.fecha_registro,
       STRING_AGG(c.nombre, ', ' ORDER BY c.nombre) AS cargos
FROM trabajadores t
LEFT JOIN trabajador_cargos tc ON t.id_trabajador = tc.id_trabajador
LEFT JOIN cargos c ON tc.id_cargo = c.id_cargo
WHERE t.activo = TRUE
GROUP BY t.id_trabajador, t.nombre, t.telefono, t.activo, t.fecha_registro;
