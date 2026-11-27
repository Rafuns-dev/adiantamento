import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FilePlus, MapPin, Calendar, DollarSign, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface NewRequestProps {
  setCurrentTab: (tab: string) => void;
}

export const NewRequestModal: React.FC<NewRequestProps> = ({ setCurrentTab }) => {
  const { createRequest, currentUser } = useApp();

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [project, setProject] = useState<'Ericsson' | 'Nokia' | ''>('');
  const [purpose, setPurpose] = useState('');
  const [activities, setActivities] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  if (!currentUser) return null;

  const isVistoriadorAmeta = currentUser.role === 'vistoria_ameta';

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!destination.trim() || !startDate || !endDate || !purpose.trim()) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (!isVistoriadorAmeta && !project) {
      setFormError('Por favor, selecione o Projeto (Ericsson ou Nokia).');
      return;
    }
    if (isVistoriadorAmeta && !activities.trim()) {
      setFormError('Informe as atividades que justificam o adiantamento.');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAndSend = () => {
    createRequest({
      project: !isVistoriadorAmeta && project ? project : undefined,
      destination,
      startDate,
      endDate,
      purpose,
      description,
      activities: activities.trim() || undefined,
      amountRequested: 0,
    });
    setShowConfirmModal(false);
    setSuccessMessage(true);
    setTimeout(() => {
      setCurrentTab(isVistoriadorAmeta ? 'ameta-requests' : 'op-requests');
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FilePlus className="w-6 h-6 text-teal-600" />
            <span>Nova Solicitação de Adiantamento</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVistoriadorAmeta
              ? 'Informe destino, período e detalhe as atividades que justificam o adiantamento.'
              : 'Preencha os dados da viagem e seus acionamentos. O valor será definido pelo Coordenador.'}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs text-slate-400 block">
            {isVistoriadorAmeta ? 'Vistoriador AMETA' : 'Vistoriador Externo'}
          </span>
          <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
        </div>
      </div>

      {successMessage && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span className="text-sm font-semibold">Solicitação criada com sucesso! Redirecionando...</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmitClick} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Destination */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Local de Destino da Viagem <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="Ex: Belo Horizonte - MG (Torre Serra Verde)"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Data de Saída <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Data de Retorno <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Projeto (Vistoriador Externo) */}
          {!isVistoriadorAmeta && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Projeto <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['Ericsson', 'Nokia'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setProject(opt);
                      if (formError) setFormError('');
                    }}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      project === opt
                        ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Acionamentos / Finalidade */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Coloque seus site IDs <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Site IDs / Acionamento #104"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Activities Justification (required for Vistoriador AMETA) */}
          {isVistoriadorAmeta && (
            <div className="bg-teal-50/50 border border-teal-200 p-4 rounded-xl space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-900">
                Atividades para Justificar o Adiantamento <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Descreva detalhadamente as atividades que serão realizadas para justificar o adiantamento (ex: vistorias em campo, conferência técnica, deslocamentos, coleta de evidências)..."
                value={activities}
                onChange={e => setActivities(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-teal-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-teal-800">
                * Para o perfil Vistoriador AMETA, não é necessário informar valor nesta solicitação; apenas descreva as atividades que justificam o adiantamento.
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              {isVistoriadorAmeta ? 'Observações Complementares' : 'Descrição da Necessidade do Adiantamento'}
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Hospedagem, combustível, alimentação, almoço, pedágios e demais despesas necessárias durante a viagem."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentTab(isVistoriadorAmeta ? 'ameta-dashboard' : 'op-requests')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-900/30 transition-all"
          >
            Enviar Solicitação
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-6">
            <div className="flex items-center gap-3 text-teal-600">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Confirmar Envio</h3>
                <p className="text-xs text-slate-500">Revise os dados antes de enviar ao Coordenador / Financeiro.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm border border-slate-200">
              <div>
                <span className="text-slate-500 text-xs">Destino:</span>
                <p className="font-bold text-slate-900">{destination}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 text-xs">Saída:</span>
                  <p className="font-bold text-slate-900">{new Date(startDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Retorno:</span>
                  <p className="font-bold text-slate-900">{new Date(endDate).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              {project && (
                <div>
                  <span className="text-slate-500 text-xs">Projeto:</span>
                  <p className="font-bold text-teal-700">{project}</p>
                </div>
              )}
              <div>
                <span className="text-slate-500 text-xs">Acionamentos:</span>
                <p className="font-bold text-slate-900">{purpose}</p>
              </div>
              {activities.trim() && (
                <div>
                  <span className="text-slate-500 text-xs">Atividades (Justificativa):</span>
                  <p className="text-xs text-slate-800 whitespace-pre-line mt-0.5">{activities}</p>
                </div>
              )}
              <div>
                <span className="text-slate-500 text-xs">Valor do Adiantamento:</span>
                <p className="text-xs font-semibold text-amber-700 mt-0.5">
                  Será definido e retornado pelo Coordenador.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Revisar / Voltar
              </button>
              <button
                onClick={confirmAndSend}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md"
              >
                Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
