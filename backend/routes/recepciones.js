const express = require('express');
const router = express.Router();
const c = require('../controllers/recepcionController');
router.get('/', c.getAll);
router.get('/:id', c.getById);
router.post('/', c.create);
router.patch('/:id/cerrar', c.close);
module.exports = router;
