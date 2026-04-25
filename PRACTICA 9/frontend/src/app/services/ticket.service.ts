import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ticket, CreateTicketRequest, UpdateTicketRequest, TicketEstado, TicketPrioridad } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  constructor(private http: HttpClient) {}

  getAll(estado?: TicketEstado, prioridad?: TicketPrioridad): Observable<Ticket[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    if (prioridad) params = params.set('prioridad', prioridad);
    return this.http.get<Ticket[]>(environment.ticketServiceUrl, { params });
  }

  getById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${environment.ticketServiceUrl}/${id}`);
  }

  create(data: CreateTicketRequest): Observable<Ticket> {
    return this.http.post<Ticket>(environment.ticketServiceUrl, data);
  }

  update(id: number, data: UpdateTicketRequest): Observable<Ticket> {
    return this.http.put<Ticket>(`${environment.ticketServiceUrl}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.ticketServiceUrl}/${id}`);
  }
}
