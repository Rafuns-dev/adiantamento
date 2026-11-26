export type UserRole = 'operador' | 'financeiro' | 'admin' | 'vistoria_nota' | 'vistoria_ameta';

export interface User {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  role: UserRole;
  active: boolean;
  ativo?: boolean;
  createdAt: string;
  password?: string;
  isFirstLogin?: boolean;
}

export type CadastroStatus = 'Pendente' | 'Em andamento' | 'Concluído';

export interface CadastroPrestador {
  id: string;
  // Exatos 16 campos do formulário público
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  filiacaoMae: string;
  filiacaoPai: string;
  funcao: string;
  empresa: string;
  cnpj: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  cidadeUf: string;
  dadosBancarios: string;
  chavePix: string;
  // Metadados de fluxo
  status: CadastroStatus;
  criadoEm: string;
  concluidoEm?: string;
  concluidoPorUid?: string;
  concluidoPorNome?: string;
}

export type NotaEquipeStatus = 'Emitida' | 'Aguardando comprovante' | 'Comprovada';

export interface NotaFiscalEquipe {
  id: string;
  prestadorId: string;
  prestadorNome: string;
  prestadorCnpj: string;
  prestadorEmpresa?: string;
  prestadorFuncao?: string;
  numero: string;
  dataEmissao: string;
  valor: number;
  descricao: string;
  observacoes?: string;
  arquivoPath?: string;
  arquivoNome?: string;
  arquivoData?: string;
  status: NotaEquipeStatus;
  criadoPorUid: string;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ComprovanteServico {
  id: string;
  notaId?: string;
  requestId?: string;
  prestadorId?: string;
  prestadorName?: string;
  categoria?: ExpenseCategory;
  valor?: number;
  descricao: string;
  data: string;
  arquivoPath: string;
  arquivoNome?: string;
  arquivoData?: string;
  tipo: 'application/pdf' | 'image/jpeg' | 'image/png';
  tamanho: number;
  criadoPorUid: string;
  criadoPorNome: string;
  criadoEm: string;
}

export interface AuditoriaEntry {
  id: string;
  acao: string;
  entidade: 'cadastro' | 'nota' | 'comprovante' | 'usuario' | 'solicitacao';
  entidadeId: string;
  detalhes?: string;
  autorUid: string;
  autorNome: string;
  autorRole: UserRole | string;
  criadoEm: string;
}

export type RequestStatus =
  | 'Solicitação enviada'
  | 'Em análise financeira'
  | 'Aguardando ajustes'
  | 'Rejeitado'
  | 'Autorizado emitir Nota Fiscal'
  | 'Nota Fiscal enviada'
  | 'Nota Fiscal em conferência'
  | 'Nota Fiscal devolvida para correção'
  | 'Aguardando pagamento'
  | 'Pago'
  | 'Aguardando prestação de contas'
  | 'Prestação em análise'
  | 'Prestação devolvida para ajustes'
  | 'Aguardando devolução de saldo'
  | 'Aguardando aprovação de reembolso'
  | 'Finalizado'
  | 'Cancelado';

export type ExpenseCategory =
  | 'Hospedagem'
  | 'Combustível'
  | 'Alimentação'
  | 'Almoço'
  | 'Pedágios'
  | 'Estacionamento'
  | 'Outras despesas';

export interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  date: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  receiptData?: string;
  approved?: boolean;
  reviewComment?: string;
}

export interface InvoiceData {
  number: string;
  cnpj: string;
  emissionDate: string;
  amount: number;
  pdfUrl?: string;
  pdfData?: string;
  xmlUrl?: string;
  xmlData?: string;
  status: 'pendente' | 'aprovado' | 'devolvido';
  reviewComment?: string;
}

export interface PaymentData {
  amountPaid: number;
  date: string;
  method: 'PIX' | 'Transferência Bancária' | 'DOC/TED';
  transactionId: string;
  receiptUrl?: string;
  receiptData?: string;
}

export interface RefundData {
  amount: number;
  date: string;
  method: 'PIX' | 'Depósito' | 'Desconto em folha/repasse';
  receiptUrl?: string;
  receiptData?: string;
}

export interface AccountabilityData {
  expenses: ExpenseItem[];
  totalExpenses: number;
  balanceType: 'saldo_a_devolver' | 'excedente' | 'zerado';
  balanceAmount: number;
  refundDetails?: RefundData;
  reimbursementStatus?: 'pendente' | 'aprovado';
}

export interface AuditLogEntry {
  id: string;
  date: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  comment?: string;
  statusBefore?: RequestStatus;
  statusAfter?: RequestStatus;
}

export interface AdvanceRequest {
  id: string;
  code: string; // e.g. "ADV-2026-001"
  operatorId: string;
  operatorName: string;
  requesterRole?: UserRole;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  description: string;
  activities?: string;
  amountRequested: number;
  status: RequestStatus;
  createdAt: string;
  invoiceAuthorized?: boolean;
  invoiceObservation?: string;
  invoice?: InvoiceData;
  payment?: PaymentData;
  accountability?: AccountabilityData;
  history: AuditLogEntry[];
}
