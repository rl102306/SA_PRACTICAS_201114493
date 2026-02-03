const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/user.repository');

class AuthService {
  constructor() {
    this.repo = new UserRepository();
  }

  async register({ email, password, role }) {
    const hash = await bcrypt.hash(password, 10);
    await this.repo.create(email, hash, role);
    return { message: 'Usuario registrado correctamente' };
  }

  async login({ email, password }) {
    const user = await this.repo.findByEmail(email);
    if (!user) throw new Error('Usuario no existe');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Credenciales inválidas');

    const token = jwt.sign(
      { id: user.id, role: user.role },
      'secret',
      { expiresIn: '1h' }
    );

    return { token };
  }
}

module.exports = AuthService;