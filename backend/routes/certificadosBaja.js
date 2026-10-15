const express = require('express');
const router = express.Router();
const c = require('../controllers/certificadoBajaController');

router.get('/envase/:idEnvase', c.getByEnvase);
router.get('/', c.getAll);
router.get('/:id', c.getById);

module.exports = router;
