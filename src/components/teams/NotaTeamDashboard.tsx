import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Users,
  Clock,
  CheckCircle2,
  ArrowRight,
  FilePlus2,
} from 'lucide-react';

interface NotaTeamDashboardProps {
  setCurrentTab: (tab: string) => void;
}

export const NotaTeamDashboard: React.FC<NotaTeamDashboardProps> = ({ setCurrentTab }) => {
  const { cadastros, notasEquipe } = useApp();

  const prestadoresComNotaIds = new Set(notasEquipe.map((n) => n.prestadorId));
  const prestadoresSemNota = cadastros.filter((c) => !prestadoresComNotaIds.has(c.id));
  const notasEmitidas = notasEquipe.filter((n) => n.status === 'Emitida');
  const notasAguardando = notasEquipe.filter((n) => n.status === 'Aguardando comprovante');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Vistoriador Externo – Notas
          </span>
          <h2 className="text-2xl font-extrabold">Fila de Emissão de Notas Fiscais</h2>
          <p className="text-xs text-slate-300 mt-1">
            Emita e registre as notas fiscais dos prestadores antes da execução do serviço.
          </p>
        </div>
        <button
          onClick={() => setCurrentTab('nota-fiscais')}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors shrink-0"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Ir para Notas Fiscais</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Prestadores sem Nota
            </span>
            <span className="text-3xl font-extrabold text-amber-600 tabular-nums mt-2 block">
              {prestadoresSemNota.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Aguardando registro inicial de NF
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Notas Emitidas
            </span>
            <span className="text-3xl font-extrabold text-indigo-600 tabular-nums mt-2 block">
              {notasEmitidas.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Disponíveis para edição / envio
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Total de Notas Registradas
            </span>
            <span className="text-3xl font-extrabold text-teal-600 tabular-nums mt-2 block">
              {notasEquipe.length}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {notasAguardando.length} aguardando comprovante
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Queue of providers without invoice (NO sensitive PII: only nome, funcao, cnpj, empresa) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Prestadores sem Nota Registrada
            </h3>
            <p className="text-xs text-slate-500">
              Exibição corporativa restrita a nome, função, CNPJ e empresa.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('nota-fiscais')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
          >
            <span>Registrar nota</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="py-3 px-6">Prestador</th>
                <th className="py-3 px-6">Função</th>
                <th className="py-3 px-6">Empresa</th>
                <th className="py-3 px-6">CNPJ</th>
                <th className="py-3 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prestadoresSemNota.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Todos os prestadores cadastrados já possuem pelo menos uma nota registrada.
                  </td>
                </tr>
              ) : (
                prestadoresSemNota.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-6 font-bold text-slate-900">{p.nome}</td>
                    <td className="py-3.5 px-6 text-slate-700">{p.funcao}</td>
                    <td className="py-3.5 px-6 text-slate-700">{p.empresa}</td>
                    <td className="py-3.5 px-6 font-mono tabular-nums text-slate-600">{p.cnpj}</td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => setCurrentTab('nota-fiscais')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors"
                      >
                        Registrar nota
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
