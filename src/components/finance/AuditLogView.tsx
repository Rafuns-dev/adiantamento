import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { requests, auditoria } = useApp();
  const [tab, setTab] = useState<'equipes' | 'adiantamentos'>('equipes');

  const allRequestLogs = requests
    .flatMap((req) =>
      req.history.map((h) => ({
        ...h,
        requestCode: req.code,
        destination: req.destination,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-teal-600" />
            <span>Histórico Geral e Auditoria</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro imutável de notas criadas/editadas, comprovantes enviados, downloads e
            adiantamentos.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setTab('equipes')}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${
              tab === 'equipes'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Auditoria Notas & Comprovantes ({auditoria.length})
          </button>
          <button
            onClick={() => setTab('adiantamentos')}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${
              tab === 'adiantamentos'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Histórico de Adiantamentos ({allRequestLogs.length})
          </button>
        </div>
      </div>

      {tab === 'equipes' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-6">Data / Hora</th>
                  <th className="py-3.5 px-6">Entidade</th>
                  <th className="py-3.5 px-6">Ação / Detalhes</th>
                  <th className="py-3.5 px-6">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditoria.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      Nenhum registro na auditoria ainda.
                    </td>
                  </tr>
                ) : (
                  auditoria.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-6 text-slate-600 font-mono tabular-nums">
                        {new Date(item.criadoEm).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                          {item.entidade}
                        </span>
                        <span className="block font-mono text-[11px] text-slate-500 mt-0.5">
                          {item.entidadeId}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-bold text-slate-900 block">{item.acao}</span>
                        {item.detalhes && (
                          <span className="text-slate-600 block mt-0.5">{item.detalhes}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-semibold text-slate-900">{item.autorNome}</span>
                        <span className="block uppercase text-[10px] text-slate-500 font-bold">
                          {item.autorRole}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-6">Data / Hora</th>
                  <th className="py-3.5 px-6">Solicitação</th>
                  <th className="py-3.5 px-6">Ação Realizada</th>
                  <th className="py-3.5 px-6">Responsável</th>
                  <th className="py-3.5 px-6">Transição de Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allRequestLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-slate-50">
                    <td className="py-3.5 px-6 text-slate-600 font-mono tabular-nums">
                      {new Date(log.date).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {log.requestCode}
                      <span className="block font-normal text-[11px] text-slate-500">
                        {log.destination}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">
                      {log.title}
                      {log.comment && (
                        <span className="block text-[11px] text-slate-500 italic mt-0.5">
                          "{log.comment}"
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-semibold text-slate-900">{log.authorName}</span>
                      <span className="block uppercase text-[9px] text-slate-500 font-bold">
                        {log.authorRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      {log.statusBefore && log.statusAfter ? (
                        <span className="text-[11px] text-slate-600">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                            {log.statusBefore}
                          </span>{' '}
                          →{' '}
                          <span className="bg-teal-50 text-teal-800 font-bold px-1.5 py-0.5 rounded">
                            {log.statusAfter}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
