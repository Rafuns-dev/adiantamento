import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, UserPlus, Mail, CheckCircle2, Edit3, ShieldAlert } from 'lucide-react';
import { User, UserRole } from '../../types';
import { ROLE_META } from '../../utils/roleConfig';

export const UsersManagement: React.FC = () => {
  const { users, currentUser, addUser, updateUser, toggleUserStatus, sendPasswordReset } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('operador');
  const [passwordMode, setPasswordMode] = useState<'email' | 'manual'>('email');
  const [password, setPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdminOrCoord = currentUser?.role === 'admin' || currentUser?.role === 'financeiro';

  if (!currentUser || !isAdminOrCoord) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-lg font-extrabold text-slate-900">
          Acesso Restrito (Financeiro &amp; Coordenação)
        </h3>
        <p className="text-xs text-slate-500">
          Somente o perfil Administrador (Financeiro e Coordenação) pode gerenciar usuários e permissões de acesso.
        </p>
      </div>
    );
  }

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setCpfCnpj('');
    setPhone('');
    setRole('operador');
    setPasswordMode('email');
    setPassword('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setErrorMsg('');
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setCpfCnpj(u.cpfCnpj);
    setPhone(u.phone);
    setRole(u.role);
    setPassword('');
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const cleanPass = password.trim();
    setErrorMsg('');
    setSaving(true);

    try {
      if (editingUser) {
        // O e-mail de login não muda aqui (ele é a conta no Firebase Authentication).
        await updateUser(editingUser.id, { name, cpfCnpj, phone, role });
        setSuccessMsg(`Usuário ${name} atualizado com sucesso!`);
      } else {
        const result = await addUser({
          name,
          email,
          cpfCnpj,
          phone,
          role,
          ...(passwordMode === 'email'
            ? { sendPasswordEmail: true }
            : cleanPass
              ? { password: cleanPass }
              : {}),
        });
        if (passwordMode === 'email') {
          setSuccessMsg(
            result.emailSent
              ? `Usuário ${name} cadastrado! Enviamos um e-mail para ${email.trim()} para a pessoa escolher a própria senha.`
              : `Usuário ${name} cadastrado, mas não foi possível enviar o e-mail automático (${result.emailError || 'use Editar para reenviar'}).`
          );
        } else {
          setSuccessMsg(
            cleanPass
              ? `Usuário ${name} cadastrado com senha definida!`
              : `Usuário ${name} cadastrado com senha padrão 'ameta123'!`
          );
        }
      }
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser) return;
    setErrorMsg('');
    try {
      await sendPasswordReset(editingUser.email);
      setSuccessMsg(`E-mail de redefinição de senha enviado para ${editingUser.email}.`);
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            <span>Usuários e Permissões (Financeiro &amp; Coordenação)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie acessos de Vistoriador Externo, Vistoriador AMETA e Administrador (Financeiro &amp; Coordenação).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Nome / E-mail</th>
                <th className="py-3.5 px-6">CPF / CNPJ</th>
                <th className="py-3.5 px-6">Telefone</th>
                <th className="py-3.5 px-6">Perfil</th>
                <th className="py-3.5 px-6">Situação</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const meta = ROLE_META[u.role];
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 block text-sm">{u.name}</span>
                      <span className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {u.email}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono tabular-nums text-slate-700">
                      {u.cpfCnpj || '-'}
                    </td>
                    <td className="py-4 px-6 text-slate-600">{u.phone || '-'}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${meta.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          u.active ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          u.active
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                        }`}
                      >
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingUser ? 'Editar Usuário e Perfil' : 'Cadastrar Novo Usuário'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Juliano Ramos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  E-mail Corporativo <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  readOnly={!!editingUser}
                  placeholder="exemplo@ameta.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full p-3 border border-slate-200 rounded-xl ${
                    editingUser ? 'bg-slate-100 text-slate-500' : 'bg-slate-50'
                  }`}
                />
                {editingUser && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    O e-mail é o login do usuário no Firebase e não pode ser alterado aqui.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Perfil de Acesso <span className="text-red-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="admin">Administrador (Financeiro &amp; Coordenação)</option>
                  <option value="operador">Vistoriador Externo</option>
                  <option value="vistoria_ameta">Vistoriador AMETA – Comprovantes</option>
                  {editingUser?.role === 'vistoria_nota' && (
                    <option value="vistoria_nota">Vistoriador Externo – Notas (Legado)</option>
                  )}
                  {editingUser?.role === 'financeiro' && (
                    <option value="financeiro">Financeiro &amp; Coordenação</option>
                  )}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-slate-500">Selo:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${ROLE_META[role].badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${ROLE_META[role].dotClass}`} />
                    {ROLE_META[role].label}
                  </span>
                </div>
              </div>

              {editingUser ? (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-[11px] text-slate-600">
                    A senha fica guardada com segurança no Firebase e não pode ser alterada por aqui.
                    Para trocar, envie um e-mail de redefinição para o usuário.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    Enviar e-mail de redefinição de senha
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Definição da Senha de Acesso
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPasswordMode('email')}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          passwordMode === 'email'
                            ? 'border-teal-600 bg-teal-50/70 text-teal-900'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-bold flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          Enviar por e-mail
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          A pessoa escolhe a própria senha pelo link no e-mail.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPasswordMode('manual')}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          passwordMode === 'manual'
                            ? 'border-teal-600 bg-teal-50/70 text-teal-900'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-bold block">Definir senha agora</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          Informar senha manualmente ou usar padrão.
                        </span>
                      </button>
                    </div>
                  </div>

                  {passwordMode === 'email' ? (
                    <div className="text-[11px] text-teal-800 bg-teal-50 p-3 rounded-xl border border-teal-200 flex items-start gap-2">
                      <Mail className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>
                        Ao cadastrar, será enviado um e-mail para{' '}
                        <strong>{email.trim() || 'o endereço informado acima'}</strong> com o link
                        para a pessoa criar sua própria senha de acesso.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Senha de Acesso (opcional)
                        </label>
                        <input
                          type="password"
                          placeholder="Deixe em branco para usar a padrão 'ameta123'"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>

                      {!password.trim() && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          Se deixado em branco, o usuário receberá a senha padrão{' '}
                          <strong>ameta123</strong> e deverá alterá-la no primeiro login.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {errorMsg && (
                <p className="text-[12px] font-semibold text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {errorMsg}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white font-bold shadow-md hover:bg-teal-500 disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
