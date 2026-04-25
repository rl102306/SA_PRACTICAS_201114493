const express = require('express');
const router = express.Router();
const { create, getAll, getById, update, remove } = require('../controllers/ticketController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getAll);
router.post('/', create);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
