const express = require('express');
const cors = require('cors');
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

app.get('/', (req, res) => {
    res.json({ message: 'API GasAgas v2.0 - Control de Envases', version: '2.0' });
});

app.get('/api/health', async (req, res) => {
    try {
        const db = require('./config/database');
        await db.query('SELECT NOW()');
        res.json({ status: 'OK', database: 'Conectada', version: '2.0', timestamp: new Date() });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'Desconectada', error: error.message });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
    console.log(`GasAgas v2.0 - Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
