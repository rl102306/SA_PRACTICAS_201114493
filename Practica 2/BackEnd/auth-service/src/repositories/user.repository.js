const db = require('../config/db');

class UserRepository {
  async create(email, password, role) {
    await db.query(
      'INSERT INTO users(email, password, role) VALUES($1,$2,$3)',
      [email, password, role]
    );
  }

  async findByEmail(email) {
    const res = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return res.rows[0];
  }
}

module.exports = UserRepository;