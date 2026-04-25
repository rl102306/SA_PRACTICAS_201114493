export type TicketEstado = 'abierto' | 'en_progreso' | 'cerrado';
export type TicketPrioridad = 'baja' | 'media' | 'alta';

export interface Ticket {
  id: number;
  titulo: string;
  descripcion: string;
  estado: TicketEstado;
  prioridad: TicketPrioridad;
  usuario_id: number;
  fecha_creacion: string;
  fecha_actualizacion?: string;
}

export interface CreateTicketRequest {
  titulo: string;
  descripcion: string;
  prioridad: TicketPrioridad;
}

export interface UpdateTicketRequest {
  titulo?: string;
  descripcion?: string;
  estado?: TicketEstado;
  prioridad?: TicketPrioridad;
}
