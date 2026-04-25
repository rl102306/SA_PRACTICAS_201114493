const express = require('express');
const router = express.Router();
const { register, login, getAll, getById, update, remove, getProfile } = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.get('/', verifyToken, isAdmin, getAll);
router.get('/:id', verifyToken, getById);
router.put('/:id', verifyToken, update);
router.delete('/:id', verifyToken, isAdmin, remove);

module.exports = router;
