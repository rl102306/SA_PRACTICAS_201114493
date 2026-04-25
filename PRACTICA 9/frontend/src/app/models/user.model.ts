export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'agente' | 'cliente';
  fecha_creacion?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  rol?: 'admin' | 'agente' | 'cliente';
}
