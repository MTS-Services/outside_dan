import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import PasswordInput from '../../components/PasswordInput';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@restaurant.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data);
      toast.success('Willkommen zurück');
      navigate('/admin');
    } catch (err) {
      toast.error(err.displayMessage || 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-hero p-4">
      <form onSubmit={onSubmit} className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="w-12 h-12 mx-auto rounded-full bg-brand-500 grid place-items-center font-display text-2xl mb-3">RR</span>
          <h1 className="text-3xl">MITARBEITER-LOGIN</h1>
          <p className="text-white/50 text-sm">Küche & Admin-Dashboard</p>
        </div>
        <label className="block mb-4">
          <span className="label">E-Mail</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block mb-6">
          <span className="label">Passwort</span>
          <PasswordInput className="input w-full" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button disabled={loading} className="btn-primary w-full">
          {loading ? 'Anmeldung läuft…' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}
