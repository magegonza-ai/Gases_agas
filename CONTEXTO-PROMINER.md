# CONTEXTO PROMINER — Documento de traspaso

> Archivo de apoyo para retomar el trabajo en **otro computador** (o en una
> sesión nueva de OpenCode). Léelo completo antes de tocar nada.
> Última actualización: **2026-10-15**.

---

## 1. Qué es este proyecto

**PROMINER — Control de Envases**: aplicación web para el control de cilindros
de gas (recepción, llenado, órdenes de trabajo, entregas y guías de despacho).

- **Backend:** Node.js + Express 5 + SQLite (`better-sqlite3`).
- **Frontend:** React + Vite + React-Bootstrap (SPA).
- **Puerto:** `3000` (el backend sirve además el frontend compilado).
- **Idioma de trabajo:** todo en **español**.
- **Versión:** `2.1.0`.

---

## 2. Estado actual (lo último que se hizo)

Se implementó el **certificado de baja por prueba hidráulica rechazada en el
local** (ver sección 8). Todo quedó:

- Implementado ✅
- Probado end-to-end (backend) y verificado en navegador ✅
- Empaquetado en el ZIP portable ✅
- **Commit local `3b0955b` en la rama `main` — AÚN NO subido a `origin`** ⚠️

Antes de eso, el proyecto ya estaba funcional, con la base de datos limpiada
(solo catálogos, sin movimientos) y con el commit `119f3d0` subido a `origin/main`.

---

## 3. Cómo levantar el proyecto

### Desarrollo (este equipo)
```powershell
# Backend (puerto 3000)
Start-Process node server.js -WorkingDirectory C:\proyectos\Gases_agas\backend

# Frontend en modo dev (opcional, puerto 5173)
cd C:\proyectos\Gases_agas\frontend
npm run dev
```
Con el backend arriba, abre **http://localhost:3000** (sirve la versión compilada
de `frontend/dist`). Para recompilar la interfaz:
```powershell
cd C:\proyectos\Gases_agas\frontend
npm run build
```

### Instalación desde cero (otro PC)
```powershell
git clone https://github.com/magegonza-ai/Gases_agas.git C:\proyectos\Gases_agas
cd C:\proyectos\Gases_agas\backend;  npm install
cd C:\proyectos\Gases_agas\frontend; npm install; npm run build
```

### Distribución portable (sin instalar Node)
El ZIP **`PROMINER-Portable-v2.1.0.zip`** ya incluye `node.exe`, el backend y la
interfaz. En este PC se regenera con **`crear-portable.bat`** (o
`build_portable.ps1`). En el otro PC: descomprimir en `C:\PROMINER` y ejecutar
`iniciar.bat`. Ver `LEEME-PRIMERO.txt`.

> ⚠️ Para regenerar el ZIP el servidor debe estar **detenido** (si no, el archivo
> `backend\data\prominer.db` está bloqueado y el build falla).

---

## 4. Estructura de carpetas

```
C:\proyectos\Gases_agas\
├─ backend\                 API Express
│  ├─ config\database.js    conexión, initSchema y migraciones idempotentes
│  ├─ models\               lógica de datos (Envase, Recepcion, OrdenTrabajo,
│  │                        CertificadoBaja, Llenado, Entrega, GuiaDespacho...)
│  ├─ controllers\          capa HTTP
│  ├─ routes\               rutas (se registran en server.js)
│  ├─ data\prominer.db      base de datos SQLite (IGNORADA en git)
│  ├─ limpiar_datos.js      borra movimientos y deja solo catálogos
│  └─ server.js             entrada del servidor
├─ frontend\
│  ├─ src\pages\            Dashboard, Recepciones, Cilindros, Llenados,
│  │                        OrdenesTrabajo, CilindrosBaja, Entregas,
│  │                        GuiasDespacho, Clientes, Productos, Trabajadores,
│  │                        PlantasExternas, NuevaRecepcion
│  ├─ src\services\         api.js, pdfService.js (pdfmake)
│  ├─ src\layouts\Layout.jsx menú lateral + botón "Cerrar aplicación"
│  └─ dist\                 build (IGNORADO en git)
├─ schema_sqlite.sql        DDL + datos semilla
├─ build_portable.ps1 / crear-portable.bat
├─ iniciar.bat / detener.bat / limpiar.bat
├─ LEEME-PRIMERO.txt        guía de instalación del paquete portable
└─ PROMINER-Portable-v2.1.0.zip   (IGNORADO en git)
```

---

## 5. Base de datos

- Archivo: **`backend\data\prominer.db`** (SQLite). Está **ignorado en git**.
- Se inicializa desde `schema_sqlite.sql`; si ya existe, **no** se recrea.
- **Migraciones idempotentes** en `backend/config/database.js` → `runMigrations()`:
  se ejecutan en cada arranque y agregan columnas/tablas/vistas faltantes.
  - Aquí se aplicó `certificados_baja` y se recrea la vista
    `vw_guias_despacho_completo`.
- Fechas/horas: se usa la **hora local** del equipo (hay un override de
  `datetime()`), no UTC.
- Numeraciones las genera **el servidor**: `OT-00001`, `GUIA-00001`,
  `REC-YYYYMMDD-####`, `CERT-00001`.
- La base de datos de trabajo está **limpia** (solo catálogos de ejemplo).

---

## 6. Comandos útiles (Windows / PowerShell)

```powershell
# Detener todo node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Probar en una base de datos aislada (no toca la real)
$env:DB_PATH='C:\ruta\prueba.db'; $env:PORT='3100'; node server.js

# Limpiar datos operativos (deja catálogos)
node backend\limpiar_datos.js      # pide confirmación

# Recompilar interfaz
cd frontend; npm run build
```

**Gotchas de PowerShell en este equipo:**
- `curl` es un alias → usar **`curl.exe`**.
- `node -e "..."` con comillas falla → usar un archivo `.js` temporal.
- Scripts que necesiten `better-sqlite3` requieren
  `$env:NODE_PATH='C:\proyectos\Gases_agas\backend\node_modules'`.
- El build de Vite avisa de un chunk >500 kB: **es esperado**, no es error.

---

## 7. Reglas y decisiones del proyecto

- Responder siempre en **español**.
- Horas/fechas en **hora local** del equipo.
- La numeración de documentos la asigna el **servidor** (no el cliente).
- El **paquete portable** es el medio de distribución (no instalador).
- Los **catálogos** (clientes, trabajadores, productos, plantas, cargos) se
  conservan; `limpiar_datos.js` borra **solo movimientos**.
- `.gitignore` excluye: `node_modules/`, `frontend/dist/`, `backend/data/`,
  `*.zip`, `*.tar`, `*.log`, `.env`.
- La app se **cierra** con el botón "Cerrar aplicación" del menú (llama a
  `/api/system/shutdown`).

---

## 8. Funcionalidad recién agregada: CERTIFICADO DE BAJA

**Regla de negocio:** al completar la OT de **prueba hidráulica en el local**, el
resultado puede ser **Aprobado** o **Rechazado**.

- **Aprobado** → el cilindro se habilita (pasa a `Vacio`), como antes.
- **Rechazado** → se **emite un certificado de baja** (con **glosa/detalle** y
  **responsable firmante**), y el cilindro queda en estado **`Baja`**:
  - **No puede recepcionarse** de nuevo ni llenarse.
  - Aparece contado en el **Dashboard** ("Cilindros de Baja").
  - Se lista y se puede reimprimir en la pantalla **Cilindros de Baja**.

**Dónde está implementado:**
| Capa | Archivo |
|---|---|
| Tabla + migración | `schema_sqlite.sql`, `backend/config/database.js` |
| Modelo | `backend/models/CertificadoBaja.js` |
| Lógica de rechazo | `backend/models/OrdenTrabajo.js` → `complete()` |
| Bloqueo de re-recepción | `backend/models/Recepcion.js` → `create()` |
| API | `backend/controllers/certificadoBajaController.js`, `backend/routes/certificadosBaja.js` |
| PDF | `frontend/src/services/pdfService.js` → `generateCertificadoBajaPDF` |
| Pantalla OT | `frontend/src/pages/OrdenesTrabajo.jsx` (glosa + responsable + modal) |
| Pantalla nueva | `frontend/src/pages/CilindrosBaja.jsx` (+ ruta en `App.jsx`, enlace en `Layout.jsx`) |
| Dashboard | `frontend/src/pages/Dashboard.jsx` |
| Limpieza | `backend/limpiar_datos.js` (incluye `certificados_baja`) |

**Endpoint:** `GET /api/certificados-baja` (y `/:id`, `/envase/:idEnvase`).

**Verificado:** flujo completo (recepción → OT → rechazo → `CERT-00001` → cilindro
`Baja` → re-recepción bloqueada) y regresión con resultado **Aprobado**.

---

## 9. Git

- Repo: `https://github.com/magegonza-ai/Gases_agas.git` · rama `main`.
- Últimos commits:
  - `3b0955b` — *certificado de baja por prueba hidráulica rechazada* (**local, sin subir**)
  - `119f3d0` — flujo completo de control de envases + paquete portable (subido)
- Para continuar en otro PC:
  ```powershell
  cd C:\proyectos\Gases_agas
  git push        # desde ESTE equipo, para subir 3b0955b
  ```

---

## 10. Pendientes / ideas futuras

- Subir `3b0955b` a `origin/main` (si aún no se hizo).
- (Opcional) Marcar visualmente los cilindros en estado `Baja` dentro de la
  pantalla **Cilindros**.
- (Opcional) Permitir elegir el responsable del certificado por **texto libre**.
- (Opcional) Reimprimir el certificado desde la ficha del cilindro.

---

## 11. Para la próxima sesión de OpenCode

Al abrir esta carpeta en OpenCode, basta con pedir:
> "Lee `CONTEXTO-PROMINER.md` y continúa desde ahí."

Este documento resume el estado, las decisiones y los pendientes, para que la
nueva sesión (que **no** tiene el historial del chat) pueda seguir sin perder
contexto.
