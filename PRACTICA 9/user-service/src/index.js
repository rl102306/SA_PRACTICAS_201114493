require('dotenv').config();
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const { initDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
});

const start = async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`User service corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('Error al iniciar user-service:', err.message);
    process.exit(1);
  }
};

start();
