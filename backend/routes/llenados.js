const express = require('express');
const router = express.Router();
const c = require('../controllers/llenadoController');
router.get('/pendientes', c.getPendientes);
router.get('/en-transito', c.getEnTransito);
router.get('/historial', c.getHistorial);
router.get('/', c.getAll);
router.post('/', c.create);
module.exports = router;