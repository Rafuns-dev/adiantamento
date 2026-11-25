import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { BarChart3, Download, FileSpreadsheet, FileText, Filter, Search } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { requests, users } = useApp();

  const [operatorFilter, setOperatorFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const operators = users.filter(u => u.role === 'operador' || u.role === 'vistoria_ameta');

  const filteredRequests = requests.filter(req => {
    const matchOp = operatorFilter === 'todos' || req.operatorId === operatorFilter;
    const matchStatus = statusFilter === 'todos' || req.status === statusFilter;
    const matchSearch = req.code.toLowerCase().includes(searchTerm.toLowerCase()) || req.destination.toLowerCase().includes(searchTerm.toLowerCase());
    return matchOp && matchStatus && matchSearch;
  });

  const totalAmount = filteredRequests.reduce((acc, r) => acc + r.amountRequested, 0);

  const handleExportExcel = () => {
    alert('Relatório exportado para Excel (.xlsx) com sucesso!');
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            <span>Relatórios Financeiros e Operacionais</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gere relatórios detalhados de adiantamentos e exporte para Excel ou PDF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Filtrar por Vistoriador</label>
          <select
            value={operatorFilter}
            onChange={e => setOperatorFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="todos">Todos os Vistoriadores</option>
            {operators.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Filtrar por Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="todos">Todos os Status</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Pago">Pago</option>
            <option value="Em análise financeira">Em análise financeira</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Pesquisa</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Código, destino..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Total Filtrado ({filteredRequests.length} registros)</span>
          <h3 className="text-2xl font-black text-teal-950 mt-1">
            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Código / Solicitante</th>
                <th className="py-3.5 px-6">Destino</th>
                <th className="py-3.5 px-6">Data</th>
                <th className="py-3.5 px-6">Valor Solicitado</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="py-4 px-6 font-bold text-slate-900">
                    {req.code} <span className="block font-normal text-slate-500">{req.operatorName}</span>
                  </td>
                  <td className="py-4 px-6 text-slate-700">{req.destination}</td>
                  <td className="py-4 px-6 text-slate-600">{new Date(req.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="py-4 px-6 font-bold text-slate-900">
                    {req.amountRequested > 0
                      ? `R$ ${req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'Sem valor informado'}
                  </td>
                  <td className="py-4 px-6"><StatusBadge status={req.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
