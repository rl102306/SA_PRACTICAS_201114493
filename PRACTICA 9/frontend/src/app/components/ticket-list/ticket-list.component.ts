import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket, TicketEstado, TicketPrioridad } from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './ticket-list.component.html'
})
export class TicketListComponent implements OnInit {
  tickets: Ticket[] = [];
  loading = false;
  error = '';
  filterEstado: TicketEstado | '' = '';
  filterPrioridad: TicketPrioridad | '' = '';

  constructor(
    private ticketService: TicketService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;
    this.error = '';
    this.ticketService.getAll(
      this.filterEstado || undefined,
      this.filterPrioridad || undefined
    ).subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al cargar tickets';
        this.loading = false;
      }
    });
  }

  deleteTicket(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este ticket?')) return;
    this.ticketService.delete(id).subscribe({
      next: () => this.loadTickets(),
      error: (err) => this.error = err.error?.error || 'Error al eliminar ticket'
    });
  }

  applyFilters(): void {
    this.loadTickets();
  }
}
