const AuthService = require('../services/auth.service');

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  async register(call, callback) {
    const result = await this.authService.register(call.request);
    callback(null, result);
  }

  async login(call, callback) {
    const result = await this.authService.login(call.request);
    callback(null, result);
  }
}

module.exports = AuthController;