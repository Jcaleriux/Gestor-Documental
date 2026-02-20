import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const data = res.data?.data;

      if (res.data?.success && data?.token) {
        onLoginSuccess?.({
          token: data.token,
          user: data.user || null
        });
        setMessage('Login exitoso');
        navigate('/', { replace: true });
      } else {
        setMessage('Credenciales incorrectas');
      }
    } catch (err) {
      const apiMessage = err.response?.data?.message || err.response?.data?.error;
      setMessage(apiMessage || 'Error en login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Contrasena:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Cargando...' : 'Iniciar sesion'}
        </button>
      </form>
      {message && (
        <p style={{ marginTop: '10px', color: message.toLowerCase().includes('exitoso') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default Login;
