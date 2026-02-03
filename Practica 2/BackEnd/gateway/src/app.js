const express = require('express');
const jwt = require('jsonwebtoken');
const grpcClient = require('./grpc/client');

const app = express();
app.use(express.json());

app.post('/register', (req, res) => {
  grpcClient.Register(req.body, (err, response) => {
    if (err) return res.status(400).json(err);
    res.json(response);
  });
});

app.post('/login', (req, res) => {
  grpcClient.Login(req.body, (err, response) => {
    if (err) return res.status(401).json(err);
    res.json(response);
  });
});

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, 'secret');
    next();
  } catch {
    res.sendStatus(401);
  }
}

app.get('/profile', auth, (req, res) => {
  res.json(req.user);
});

app.listen(3000);