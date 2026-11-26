import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ChangePasswordModal: React.FC = () => {
  const { currentUser, changePassword } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 space-y-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg">Alteração de Senha Obrigatória</h3>
            <p className="text-xs text-slate-400">Este é o seu primeiro acesso ao sistema. Defina uma nova senha pessoal.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
              Nova Senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="Mínimo de 6 caracteres"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-400 mb-2">
              Confirmar Nova Senha <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="Digite novamente a nova senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-lg shadow-teal-950/50 transition-all mt-4"
          >
            {submitting ? 'Salvando...' : 'Salvar Nova Senha e Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
