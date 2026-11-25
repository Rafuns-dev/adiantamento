import React from 'react';
import { useApp } from '../../context/AppContext';
import { Camera, Clock, CheckCircle2, ArrowRight, ShieldCheck, FilePlus } from 'lucide-react';

interface AmetaTeamDashboardProps {
  setCurrentTab: (tab: string) => void;
}

export const AmetaTeamDashboard: React.FC<AmetaTeamDashboardProps> = ({ setCurrentTab }) => {
  const { notasEquipe, comprovantes } = useApp();

  const aguardandoComprovante = notasEquipe.filter(
    (n) => n.status === 'Aguardando comprovante'
  );
  const concluidos = notasEquipe.filter((n) => n.status === 'Comprovada');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-400 mb-1">
            <Camera className="w-3.5 h-3.5" />
            Vistoriador AMETA – Comprovantes
          </span>
          <h2 className="text-2xl font-extrabold">Fila de Comprovantes de Serviço</h2>
          <p className="text-xs text-slate-300 mt-1">
            Anexe os comprovantes dos serviços executados sempre vinculados a uma nota fiscal
            existente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setCurrentTab('ameta-new-request')}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <FilePlus className="w-4 h-4 text-teal-400" />
            <span>Solicitar Adiantamento</span>
          </button>
          <button
            onClick={() => setCurrentTab('ameta-comprovantes')}
            className="px-5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span>Abrir Comprovantes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Notas Aguardando Comprovante
            </span>
            <span className="text-3xl font-extrabold text-amber-600 tabular-nums mt-2 block">
              {aguardandoComprovante.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Prontas para anexo de comprovação
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Concluídos (Comprovadas)
            </span>
            <span className="text-3xl font-extrabold text-teal-600 tabular-nums mt-2 block">
              {concluidos.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Notas com comprovação enviada
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Arquivos Enviados
            </span>
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums mt-2 block">
              {comprovantes.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Registros imutáveis vinculados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pending queue table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Notas Aguardando Comprovante
            </h3>
            <p className="text-xs text-slate-500">
              Clique para abrir a nota e anexar PDF, JPG ou PNG (até 10 MB cada).
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('ameta-comprovantes')}
            className="text-xs font-bold text-teal-600 hover:text-teal-500 flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="py-3 px-6">Número NF</th>
                <th className="py-3 px-6">Prestador</th>
                <th className="py-3 px-6">Empresa / CNPJ</th>
                <th className="py-3 px-6">Valor</th>
                <th className="py-3 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aguardandoComprovante.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Nenhuma nota aguardando comprovante no momento.
                  </td>
                </tr>
              ) : (
                aguardandoComprovante.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-6 font-extrabold text-slate-900">{n.numero}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{n.prestadorNome}</td>
                    <td className="py-3.5 px-6 text-slate-600">
                      <span>{n.prestadorEmpresa || '-'}</span>
                      <span className="block text-[11px] font-mono tabular-nums text-slate-500">
                        {n.prestadorCnpj}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-bold tabular-nums text-teal-700">
                      R$ {n.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => setCurrentTab('ameta-comprovantes')}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold transition-colors"
                      >
                        Anexar Comprovante
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
