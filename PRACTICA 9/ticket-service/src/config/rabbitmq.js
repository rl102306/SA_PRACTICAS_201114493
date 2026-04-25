const amqplib = require('amqplib');

const QUEUE_NAME = 'ticket_events';
let channel = null;

const connectRabbitMQ = async () => {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    channel = await conn.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('Conectado a RabbitMQ');

    conn.on('error', (err) => {
      console.error('Error en conexión RabbitMQ:', err.message);
      channel = null;
    });

    conn.on('close', () => {
      console.warn('Conexión RabbitMQ cerrada, reintentando...');
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });
  } catch (err) {
    console.error('No se pudo conectar a RabbitMQ:', err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const publishEvent = async (eventType, data) => {
  if (!channel) {
    console.warn('Canal RabbitMQ no disponible, omitiendo evento');
    return;
  }
  const message = JSON.stringify({ eventType, data, timestamp: new Date().toISOString() });
  channel.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });
  console.log(`Evento publicado: ${eventType}`);
};

module.exports = { connectRabbitMQ, publishEvent };
