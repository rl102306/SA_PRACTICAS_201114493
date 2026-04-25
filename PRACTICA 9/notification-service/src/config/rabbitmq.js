const amqplib = require('amqplib');

const QUEUE_NAME = 'ticket_events';

const connectAndConsume = async (onMessage) => {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    const channel = await conn.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);

    console.log(`Escuchando cola: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          onMessage(content);
          channel.ack(msg);
        } catch (err) {
          console.error('Error procesando mensaje:', err.message);
          channel.nack(msg, false, false);
        }
      }
    });

    conn.on('error', (err) => {
      console.error('Error RabbitMQ:', err.message);
      setTimeout(() => connectAndConsume(onMessage), 5000);
    });

    conn.on('close', () => {
      console.warn('Conexión RabbitMQ cerrada, reintentando...');
      setTimeout(() => connectAndConsume(onMessage), 5000);
    });
  } catch (err) {
    console.error('No se pudo conectar a RabbitMQ:', err.message);
    setTimeout(() => connectAndConsume(onMessage), 5000);
  }
};

module.exports = { connectAndConsume };
