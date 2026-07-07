import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupInitialAdmin } from '../services/onboardingApi.js';
import {
  getPasswordRequirementStates,
  isStrongPassword,
} from '../utils/passwordPolicy.js';

function OnboardingSetup({ onSetupComplete }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('error');
  const passwordRequirements = useMemo(
    () => getPasswordRequirementStates(form.password),
    [form.password],
  );

  const updateField = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  const completeSetup = async () => {
    await onSetupComplete?.();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageTone('error');

    if (!isStrongPassword(form.password)) {
      setMessage('La contrasena no cumple la politica requerida.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage('La confirmacion de contrasena no coincide.');
      return;
    }

    setLoading(true);

    try {
      await setupInitialAdmin({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
      });
      setMessageTone('success');
      setMessage('Administrador creado. Inicia sesion con las credenciales creadas.');
      await completeSetup();
    } catch (error) {
      if (error.response?.status === 409) {
        await completeSetup();
        return;
      }

      const apiMessage = error.response?.data?.error || error.response?.data?.message;
      setMessage(apiMessage || 'No se pudo completar la configuracion inicial.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-card" aria-labelledby="onboarding-title">
        <div className="auth-brand">
          <img src="/logo-horizontal.svg" alt="SendaDocs" className="auth-logo" />
        </div>

        <header className="auth-header">
          <h1 id="onboarding-title">Configuracion inicial</h1>
          <p>Crea el primer administrador para activar el sistema.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Nombre</span>
            <input
              type="text"
              value={form.nombre}
              onChange={updateField('nombre')}
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          </label>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={updateField('email')}
              autoComplete="email"
              required
              maxLength={100}
            />
          </label>

          <label className="auth-field">
            <span>Contrasena</span>
            <input
              type="password"
              value={form.password}
              onChange={updateField('password')}
              autoComplete="new-password"
              required
              minLength={12}
            />
          </label>

          <ul className="password-rules" aria-label="Requisitos de contrasena">
            {passwordRequirements.map((requirement) => (
              <li key={requirement.id} className={requirement.met ? 'met' : ''}>
                {requirement.label}
              </li>
            ))}
          </ul>

          <label className="auth-field">
            <span>Confirmar contrasena</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={updateField('confirmPassword')}
              autoComplete="new-password"
              required
              minLength={12}
            />
          </label>

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Creando administrador...' : 'Crear administrador'}
          </button>
        </form>

        {message && (
          <p className={`auth-message ${messageTone}`} role="status">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}

export default OnboardingSetup;
