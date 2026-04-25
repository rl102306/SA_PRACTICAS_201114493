import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { TicketPrioridad } from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ticket-create.component.html'
})
export class TicketCreateComponent {
  titulo = '';
  descripcion = '';
  prioridad: TicketPrioridad = 'media';
  loading = false;
  error = '';
  success = '';

  constructor(
    private ticketService: TicketService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.titulo.trim() || !this.descripcion.trim()) {
      this.error = 'El titulo y la descripcion son requeridos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.ticketService.create({
      titulo: this.titulo,
      descripcion: this.descripcion,
      prioridad: this.prioridad
    }).subscribe({
      next: (ticket) => {
        this.success = `Ticket #${ticket.id} creado correctamente`;
        setTimeout(() => this.router.navigate(['/tickets']), 1500);
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al crear el ticket';
        this.loading = false;
      }
    });
  }
}
