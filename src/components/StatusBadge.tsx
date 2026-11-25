import React from 'react';
import { RequestStatus } from '../types';
import {
  Clock,
  AlertCircle,
  XCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  Send,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  FileCheck,
  Check
} from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyle = (st: RequestStatus) => {
    switch (st) {
      case 'Solicitação enviada':
      case 'Em análise financeira':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="w-3.5 h-3.5" /> };
      case 'Aguardando ajustes':
      case 'Nota Fiscal devolvida para correção':
      case 'Prestação devolvida para ajustes':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertCircle className="w-3.5 h-3.5" /> };
      case 'Rejeitado':
      case 'Cancelado':
        return { bg: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> };
      case 'Autorizado emitir Nota Fiscal':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <FileText className="w-3.5 h-3.5" /> };
      case 'Nota Fiscal enviada':
      case 'Nota Fiscal em conferência':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: <FileCheck className="w-3.5 h-3.5" /> };
      case 'Aguardando pagamento':
        return { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: <DollarSign className="w-3.5 h-3.5" /> };
      case 'Pago':
      case 'Aguardando prestação de contas':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: <Send className="w-3.5 h-3.5" /> };
      case 'Prestação em análise':
      case 'Aguardando devolução de saldo':
      case 'Aguardando aprovação de reembolso':
        return { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: <RefreshCw className="w-3.5 h-3.5" /> };
      case 'Finalizado':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: <HelpCircle className="w-3.5 h-3.5" /> };
    }
  };

  const style = getBadgeStyle(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${className}`}
    >
      {style.icon}
      <span>{status}</span>
    </span>
  );
};
