const express = require('express');
const router = express.Router();
const c = require('../controllers/entregaController');
router.get('/para-entregar/:idCliente', c.getParaEntregar);
router.get('/', c.getAll);
router.get('/:id', c.getById);
router.post('/', c.create);
module.exports = router;
