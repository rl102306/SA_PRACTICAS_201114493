import React, { useState } from 'react';

const API = 'http://localhost:3005';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CLIENT');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const register = async () => {
    const res = await fetch(API + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();
    setMessage(JSON.stringify(data, null, 2));
  };

  const login = async () => {
    const res = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) setToken(data.token);
    setMessage(JSON.stringify(data, null, 2));
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'Arial' }}>
      <h2>Delivereats - Auth</h2>

      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} /><br/><br/>
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} /><br/><br/>

      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="CLIENT">CLIENT</option>
        <option value="ADMIN">ADMIN</option>
        <option value="RESTAURANT">RESTAURANT</option>
        <option value="DELIVERY">DELIVERY</option>
      </select><br/><br/>

      <button onClick={register}>Register</button>
      <button onClick={login} style={{ marginLeft: 10 }}>Login</button>

      <pre>{message}</pre>
      {token && <p><strong>JWT:</strong> {token}</p>}
    </div>
  );
}