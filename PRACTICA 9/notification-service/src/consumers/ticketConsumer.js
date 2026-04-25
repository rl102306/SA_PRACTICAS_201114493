const handleTicketEvent = (event) => {
  const { eventType, data, timestamp } = event;

  switch (eventType) {
    case 'TICKET_CREATED':
      console.log(`[NOTIFICACION] Nuevo ticket creado:
        ID: ${data.id}
        Titulo: ${data.titulo}
        Prioridad: ${data.prioridad}
        Usuario ID: ${data.usuario_id}
        Timestamp: ${timestamp}
      `);
      // Aqui se integraria el envio de email/SMS
      sendNotification('admin', `Nuevo ticket #${data.id}: ${data.titulo} (${data.prioridad})`);
      break;

    case 'TICKET_UPDATED':
      console.log(`[NOTIFICACION] Ticket actualizado:
        ID: ${data.id}
        Estado: ${data.estado}
        Timestamp: ${timestamp}
      `);
      sendNotification(`usuario_${data.usuario_id}`, `Tu ticket #${data.id} cambió a estado: ${data.estado}`);
      break;

    case 'TICKET_DELETED':
      console.log(`[NOTIFICACION] Ticket eliminado:
        ID: ${data.id}
        Timestamp: ${timestamp}
      `);
      break;

    default:
      console.warn(`Evento desconocido: ${eventType}`);
  }
};

const sendNotification = (recipient, message) => {
  // Simulacion de envio de notificacion
  console.log(`[EMAIL/SMS] Para: ${recipient} | Mensaje: ${message}`);
};

module.exports = { handleTicketEvent };
