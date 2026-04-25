require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ticketRoutes = require('./routes/ticketRoutes');
const { initDB } = require('./config/database');
const { connectRabbitMQ } = require('./config/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/api/tickets', ticketRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ticket-service', timestamp: new Date().toISOString() });
});

const start = async () => {
  try {
    await initDB();
    await connectRabbitMQ();
    app.listen(PORT, () => {
      console.log(`Ticket service corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('Error al iniciar ticket-service:', err.message);
    process.exit(1);
  }
};

start();
