import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;
  mode: 'login' | 'register' = 'login';
  nombre = '';
  rol: 'admin' | 'agente' | 'cliente' = 'cliente';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = '';
    this.loading = true;

    if (this.mode === 'login') {
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: () => this.router.navigate(['/tickets']),
        error: (err) => {
          this.error = err.error?.error || 'Error al iniciar sesión';
          this.loading = false;
        }
      });
    } else {
      this.authService.register({ nombre: this.nombre, email: this.email, password: this.password, rol: this.rol }).subscribe({
        next: () => {
          this.mode = 'login';
          this.error = '';
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.error || 'Error al registrarse';
          this.loading = false;
        }
      });
    }
  }

  toggleMode(): void {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.error = '';
  }
}
