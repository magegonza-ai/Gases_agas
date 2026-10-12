const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/trabajadores', require('./routes/trabajadores'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/envases', require('./routes/envases'));
app.use('/api/recepciones', require('./routes/recepciones'));
app.use('/api/ordenes-trabajo', require('./routes/ordenesTrabajo'));
app.use('/api/llenados', require('./routes/llenados'));
app.use('/api/entregas', require('./routes/entregas'));
app.use('/api/plantas-externas', require('./routes/plantasExternas'));
app.use('/api/guias-despacho', require('./routes/guiasDespacho'));
app.use('/api/transacciones', require('./routes/transacciones'));

app.get('/api', (req, res) => {
    res.json({ message: 'API PROMINER v2.1 - Control de Envases', version: '2.1' });
});

app.get('/api/health', async (req, res) => {
    try {
        const db = require('./config/database');
        await db.query("SELECT datetime('now')");
        res.json({ status: 'OK', database: 'Conectada', version: '2.1', timestamp: new Date() });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'Desconectada', error: error.message });
    }
});

// Rutina de salida: permite cerrar el programa (servidor + base de datos) desde la interfaz.
// El proceso responde primero y luego se cierra de forma controlada.
// Cierra también la ventana de consola "PROMINER Server" que abre iniciar.bat con cmd /k.
function cerrarVentanaServidor() {
    try {
        const { spawn } = require('child_process');
        const child = spawn('taskkill', ['/FI', 'WINDOWTITLE eq PROMINER Server*', '/F'], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
        });
        child.on('error', () => { /* la ventana ya no existe: no hacemos nada */ });
        child.unref();
    } catch (err) { /* ignore */ }
}

let apagando = false;
app.post('/api/system/shutdown', (req, res) => {
    if (apagando) return res.json({ ok: true, message: 'PROMINER ya se está cerrando' });
    apagando = true;
    res.json({ ok: true, message: 'PROMINER se está cerrando' });
    console.log('🛑 Apagado solicitado desde la interfaz. Cerrando PROMINER...');
    setTimeout(() => {
        try { require('./config/database').close(); } catch (err) { /* ignore */ }
        cerrarVentanaServidor();
        setTimeout(() => process.exit(0), 300);
    }, 400);
});

// Servir la interfaz compilada (frontend/dist) si existe.
// Permite que UN SOLO proceso sirva la API y la interfaz web en el mismo puerto (3000).
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
    app.use(express.static(frontendDist));
    // Fallback SPA: toda ruta que NO sea /api devuelve index.html (para React Router)
    app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
    console.log(`🌐 Interfaz web servida desde: ${frontendDist}`);
}

// 404 solo para rutas de API no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`PROMINER v2.1 - Servidor corriendo en http://localhost:${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});

module.exports = app;
