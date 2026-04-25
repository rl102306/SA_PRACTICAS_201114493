require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectAndConsume } = require('./config/rabbitmq');
const { handleTicketEvent } = require('./consumers/ticketConsumer');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});

const start = async () => {
  try {
    await connectAndConsume(handleTicketEvent);
    app.listen(PORT, () => {
      console.log(`Notification service corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('Error al iniciar notification-service:', err.message);
    process.exit(1);
  }
};

start();
