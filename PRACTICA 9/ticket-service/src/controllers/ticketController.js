const { pool } = require('../config/database');
const { publishEvent } = require('../config/rabbitmq');

const create = async (req, res) => {
  try {
    const { titulo, descripcion, prioridad = 'media' } = req.body;
    const usuario_id = req.user.id;

    if (!titulo || !descripcion) {
      return res.status(400).json({ error: 'titulo y descripcion son requeridos' });
    }

    const result = await pool.query(
      'INSERT INTO tickets (titulo, descripcion, prioridad, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [titulo, descripcion, prioridad, usuario_id]
    );

    const ticket = result.rows[0];
    await publishEvent('TICKET_CREATED', ticket);

    res.status(201).json(ticket);
  } catch (err) {
    console.error('Error en create ticket:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getAll = async (req, res) => {
  try {
    const { estado, prioridad } = req.query;
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];

    if (req.user.rol === 'cliente') {
      params.push(req.user.id);
      query += ` AND usuario_id = $${params.length}`;
    }

    if (estado) {
      params.push(estado);
      query += ` AND estado = $${params.length}`;
    }

    if (prioridad) {
      params.push(prioridad);
      query += ` AND prioridad = $${params.length}`;
    }

    query += ' ORDER BY fecha_creacion DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en getAll tickets:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = result.rows[0];
    if (req.user.rol === 'cliente' && ticket.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    res.json(ticket);
  } catch (err) {
    console.error('Error en getById ticket:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, estado, prioridad } = req.body;

    const existing = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = existing.rows[0];
    if (req.user.rol === 'cliente' && ticket.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await pool.query(
      `UPDATE tickets SET
        titulo = COALESCE($1, titulo),
        descripcion = COALESCE($2, descripcion),
        estado = COALESCE($3, estado),
        prioridad = COALESCE($4, prioridad),
        fecha_actualizacion = NOW()
       WHERE id = $5 RETURNING *`,
      [titulo, descripcion, estado, prioridad, id]
    );

    const updated = result.rows[0];
    await publishEvent('TICKET_UPDATED', updated);

    res.json(updated);
  } catch (err) {
    console.error('Error en update ticket:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    await publishEvent('TICKET_DELETED', { id: parseInt(id) });
    res.json({ message: 'Ticket eliminado correctamente' });
  } catch (err) {
    console.error('Error en remove ticket:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { create, getAll, getById, update, remove };
