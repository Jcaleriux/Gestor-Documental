import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PERSONAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/Jcaleriux', icon: 'github' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/josearamirezcalero/', icon: 'linkedin' },
  { label: 'Instagram', href: 'https://www.instagram.com/josecaler0/', icon: 'instagram' },
  { label: 'Correo', href: 'mailto:calero2121@hotmail.com', icon: 'mail' },
  { label: 'Sitio web', href: 'https://jcaleriux.github.io/jcaleriux/index.html', icon: 'globe' },
];

function FooterIcon({ icon }) {
  switch (icon) {
    case 'github':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175A1.16 1.16 0 0 1 0 14.854zM4.943 13.5V6.169H2.542V13.5zM3.743 5.17c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.213 2.4 3.922c0 .694.505 1.248 1.327 1.248zm9.757 8.33V9.359c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169H6.17c.03.754 0 7.331 0 7.331h2.401V9.405c0-.219.016-.438.08-.594.175-.438.576-.894 1.248-.894.88 0 1.232.675 1.232 1.665V13.5z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.087 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76c-.198.509-.333 1.09-.372 1.943C.01 5.556 0 5.829 0 8s.01 2.444.048 3.297c.039.853.174 1.434.372 1.943.205.527.478.974.923 1.417.444.445.89.718 1.417.923.509.198 1.09.333 1.943.372C5.556 15.99 5.829 16 8 16s2.444-.01 3.297-.048c.853-.039 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.417-.923 3.9 3.9 0 0 0 .923-1.417c.198-.509.333-1.09.372-1.943C15.99 10.444 16 10.171 16 8s-.01-2.444-.048-3.297c-.039-.853-.174-1.434-.372-1.943a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.509-.198-1.09-.333-1.943-.372C10.444.01 10.171 0 8 0m0 1.441c2.134 0 2.387.008 3.232.047.781.036 1.205.166 1.486.275.372.144.637.317.916.596.278.278.452.543.596.915.109.281.239.705.275 1.486.038.845.047 1.098.047 3.232s-.009 2.387-.047 3.232c-.036.781-.166 1.205-.275 1.486a2.46 2.46 0 0 1-.596.916 2.46 2.46 0 0 1-.916.596c-.281.109-.705.239-1.486.275-.845.038-1.098.047-3.232.047s-2.387-.009-3.232-.047c-.781-.036-1.205-.166-1.486-.275a2.46 2.46 0 0 1-.916-.596 2.46 2.46 0 0 1-.596-.916c-.109-.281-.239-.705-.275-1.486C1.45 10.387 1.441 10.134 1.441 8s.009-2.387.047-3.232c.036-.781.166-1.205.275-1.486.144-.372.318-.637.596-.915.279-.279.544-.452.916-.596.281-.109.705-.239 1.486-.275.845-.038 1.098-.047 3.232-.047" />
          <path d="M8 3.892A4.108 4.108 0 1 0 8 12.108 4.108 4.108 0 0 0 8 3.892m0 6.775A2.667 2.667 0 1 1 8 5.333a2.667 2.667 0 0 1 0 5.334m4.271-6.938a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92" />
        </svg>
      );
    case 'mail':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v.217l-8 4.8-8-4.8z" />
          <path d="M0 4.383v7.417a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4.383l-7.469 4.482a1 1 0 0 1-1.062 0z" />
        </svg>
      );
    case 'globe':
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m4.938 6.5h-2.09a12.6 12.6 0 0 0-.52-2.437A6.52 6.52 0 0 1 12.938 6.5M8 1.5c.56 0 1.347.96 1.79 2.5H6.21C6.653 2.46 7.44 1.5 8 1.5M1.5 8c0-.52.063-1.025.18-1.5h2.372A13.7 13.7 0 0 0 4 8c0 .517.018 1.02.052 1.5H1.68A6.5 6.5 0 0 1 1.5 8m1.562 2.5h2.09c.12.852.3 1.677.52 2.437A6.52 6.52 0 0 1 3.062 10.5M5.152 6.5h5.696c.04.48.062.983.062 1.5s-.022 1.02-.062 1.5H5.152A12.2 12.2 0 0 1 5.09 8c0-.517.022-1.02.062-1.5m.848 4h3.58c-.443 1.54-1.23 2.5-1.79 2.5s-1.347-.96-1.79-2.5m0-5c.443-1.54 1.23-2.5 1.79-2.5s1.347.96 1.79 2.5zm4.328 7.437c.22-.76.4-1.585.52-2.437h2.09a6.52 6.52 0 0 1-2.61 2.437M11.948 9.5c.034-.48.052-.983.052-1.5s-.018-1.02-.052-1.5h2.372c.117.475.18.98.18 1.5s-.063 1.025-.18 1.5z" />
        </svg>
      );
    default:
      return null;
  }
}

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
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

  const isSuccessMessage = message.toLowerCase().includes('exitoso');

  return (
    <main className="login-page">
      <div className="login-backdrop" aria-hidden="true" />

      <section className="login-stage" aria-label="Inicio de sesion de SendaDocs">
        <div className="login-brand-mark">
          <img src="/logo-horizontal.svg" alt="SendaDocs" />
        </div>

        <div className="login-form-shell">
          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Correo</label>
              <input
                id="login-email"
                className="login-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@empresa.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Contrasena</label>
              <input
                id="login-password"
                className="login-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tu contrasena"
                autoComplete="current-password"
                required
              />
            </div>

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? 'Cargando...' : 'Iniciar sesion'}
            </button>

            {message ? (
              <p className={`login-message ${isSuccessMessage ? 'success' : 'error'}`}>
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <footer className="login-footer">
        <div className="login-footer-links" aria-label="Enlaces personales">
          {PERSONAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
              title={link.label}
            >
              <FooterIcon icon={link.icon} />
            </a>
          ))}
        </div>

        <p className="login-footer-copy">{'Creado por Jose Ramirez 2026 \u00A9'}</p>
      </footer>
    </main>
  );
}

export default Login;
