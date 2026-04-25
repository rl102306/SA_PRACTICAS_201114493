import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket, TicketEstado, TicketPrioridad } from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ticket-detail.component.html'
})
export class TicketDetailComponent implements OnInit {
  ticket: Ticket | null = null;
  loading = false;
  saving = false;
  error = '';
  success = '';
  editMode = false;

  editTitulo = '';
  editDescripcion = '';
  editEstado: TicketEstado = 'abierto';
  editPrioridad: TicketPrioridad = 'media';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTicket(id);
  }

  loadTicket(id: number): void {
    this.loading = true;
    this.ticketService.getById(id).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.editTitulo = ticket.titulo;
        this.editDescripcion = ticket.descripcion;
        this.editEstado = ticket.estado;
        this.editPrioridad = ticket.prioridad;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al cargar el ticket';
        this.loading = false;
      }
    });
  }

  canEdit(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user || !this.ticket) return false;
    return user.rol === 'admin' || user.rol === 'agente' || user.id === this.ticket.usuario_id;
  }

  saveChanges(): void {
    if (!this.ticket) return;
    this.saving = true;
    this.error = '';

    this.ticketService.update(this.ticket.id, {
      titulo: this.editTitulo,
      descripcion: this.editDescripcion,
      estado: this.editEstado,
      prioridad: this.editPrioridad
    }).subscribe({
      next: (updated) => {
        this.ticket = updated;
        this.editMode = false;
        this.success = 'Ticket actualizado correctamente';
        this.saving = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al actualizar el ticket';
        this.saving = false;
      }
    });
  }
}
