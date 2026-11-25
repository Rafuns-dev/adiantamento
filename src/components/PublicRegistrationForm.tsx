import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, ArrowLeft, Send, Building2, ShieldCheck } from 'lucide-react';

interface PublicRegistrationFormProps {
  onBackToLogin?: () => void;
}

const INITIAL_16_FIELDS = {
  nome: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  filiacaoMae: '',
  filiacaoPai: '',
  funcao: '',
  empresa: '',
  cnpj: '',
  telefone: '',
  email: '',
  cep: '',
  endereco: '',
  cidadeUf: '',
  dadosBancarios: '',
  chavePix: '',
};

export const PublicRegistrationForm: React.FC<PublicRegistrationFormProps> = ({
  onBackToLogin,
}) => {
  const { createCadastro } = useApp();
  const [form, setForm] = useState(INITIAL_16_FIELDS);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleChange = (field: keyof typeof INITIAL_16_FIELDS, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await createCadastro(form);
      setSubmittedId(created.id);
      setForm(INITIAL_16_FIELDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 relative overflow-hidden font-sans">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-md">
              <img
                src="/assets/aistudio/images_feb6fbd0.png"
                alt="AMETA Serviços"
                className="w-9 h-9 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-wider">AMETA SERVIÇOS</h1>
              <p className="text-xs text-teal-400 font-semibold">
                Cadastro Público de Prestadores PJ
              </p>
            </div>
          </div>
          {onBackToLogin && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Login</span>
            </button>
          )}
        </div>

        {submittedId ? (
          <div className="bg-white rounded-3xl p-10 text-center space-y-5 shadow-2xl border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Cadastro enviado com sucesso!
              </h2>
              <p className="text-sm text-slate-600">
                Seus dados já estão disponíveis no painel AMETA para emissão de nota fiscal e
                acompanhamento operacional.
              </p>
              <p className="text-xs font-mono text-slate-500 pt-1">Protocolo: {submittedId}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setSubmittedId(null)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors"
              >
                Enviar Novo Cadastro
              </button>
              {onBackToLogin && (
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Ir para Login Interno
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-8 py-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-400" />
                  <span>Ficha Cadastral do Prestador</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Preencha todos os 16 campos obrigatórios para liberação operacional e faturamento.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-300 bg-teal-950/60 border border-teal-800/60 px-3 py-1.5 rounded-lg shrink-0">
                <ShieldCheck className="w-4 h-4" />
                <span>Dados protegidos</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 text-xs">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">
                  {error}
                </div>
              )}

              {/* Bloco 1: Identificação Pessoal */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                  1. Identificação do Prestador
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. nome */}
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nome"
                      required
                      maxLength={150}
                      placeholder="Nome completo do prestador"
                      value={form.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 4. dataNascimento */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Data de Nascimento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dataNascimento"
                      required
                      value={form.dataNascimento}
                      onChange={(e) => handleChange('dataNascimento', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 2. cpf */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      CPF <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="cpf"
                      required
                      minLength={11}
                      maxLength={20}
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={(e) => handleChange('cpf', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 3. rg */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      RG <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="rg"
                      required
                      minLength={4}
                      maxLength={30}
                      placeholder="00.000.000-0"
                      value={form.rg}
                      onChange={(e) => handleChange('rg', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 7. funcao */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Função / Especialidade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="funcao"
                      required
                      maxLength={120}
                      placeholder="Ex: Técnico de Vistoria"
                      value={form.funcao}
                      onChange={(e) => handleChange('funcao', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 5. filiacaoMae */}
                  <div className="sm:col-span-1 lg:col-span-1">
                    <label className="block font-bold text-slate-700 mb-1">
                      Filiação — Nome da Mãe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="filiacaoMae"
                      required
                      maxLength={150}
                      placeholder="Nome completo da mãe"
                      value={form.filiacaoMae}
                      onChange={(e) => handleChange('filiacaoMae', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 6. filiacaoPai */}
                  <div className="sm:col-span-1 lg:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Filiação — Nome do Pai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="filiacaoPai"
                      required
                      maxLength={150}
                      placeholder="Nome completo do pai (ou 'Não informado')"
                      value={form.filiacaoPai}
                      onChange={(e) => handleChange('filiacaoPai', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Empresa e Contato */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                  2. Dados Empresariais e Contato
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 8. empresa */}
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Empresa / Razão Social <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="empresa"
                      required
                      maxLength={180}
                      placeholder="Razão social da empresa"
                      value={form.empresa}
                      onChange={(e) => handleChange('empresa', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 9. cnpj */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      CNPJ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="cnpj"
                      required
                      minLength={14}
                      maxLength={25}
                      placeholder="00.000.000/0001-00"
                      value={form.cnpj}
                      onChange={(e) => handleChange('cnpj', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 10. telefone */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Telefone / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="telefone"
                      required
                      minLength={8}
                      maxLength={30}
                      placeholder="(11) 99999-9999"
                      value={form.telefone}
                      onChange={(e) => handleChange('telefone', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 11. email */}
                  <div className="sm:col-span-1 lg:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      maxLength={180}
                      placeholder="contato@empresa.com.br"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 3: Endereço e Pagamento */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                  3. Endereço e Dados Bancários
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 12. cep */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      CEP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="cep"
                      required
                      minLength={8}
                      maxLength={15}
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={(e) => handleChange('cep', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 13. endereco */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Endereço Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="endereco"
                      required
                      maxLength={250}
                      placeholder="Rua, número, complemento e bairro"
                      value={form.endereco}
                      onChange={(e) => handleChange('endereco', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 14. cidadeUf */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Cidade / UF <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="cidadeUf"
                      required
                      maxLength={100}
                      placeholder="São Paulo / SP"
                      value={form.cidadeUf}
                      onChange={(e) => handleChange('cidadeUf', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 15. dadosBancarios */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Dados Bancários (Banco / Ag / Conta) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="dadosBancarios"
                      required
                      maxLength={200}
                      placeholder="Banco, Agência e Conta"
                      value={form.dadosBancarios}
                      onChange={(e) => handleChange('dadosBancarios', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {/* 16. chavePix */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Chave PIX <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="chavePix"
                      required
                      maxLength={150}
                      placeholder="CNPJ, e-mail, telefone ou aleatória"
                      value={form.chavePix}
                      onChange={(e) => handleChange('chavePix', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Ao enviar, seu cadastro entra imediatamente na fila de análise e emissão de nota
                  fiscal.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-7 py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold rounded-2xl text-sm shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Enviando Cadastro...' : 'Enviar Cadastro'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
