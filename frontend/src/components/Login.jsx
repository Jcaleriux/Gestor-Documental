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
    <div className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <img src="/logo-horizontal.svg" alt="SendaDocs" className="auth-logo" />
        </div>

        <header className="auth-header">
          <h1 id="login-title">Inicio de sesion</h1>
          <p>Ingresa con las credenciales asignadas por administracion.</p>
        </header>

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'Iniciar sesion'}
          </button>
        </form>

        {message && (
          <p className={`auth-message ${message.toLowerCase().includes('exitoso') ? 'success' : 'error'}`} role="status">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}

export default Login;
