import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
} from 'firebase/auth';
import {
  User,
  AdvanceRequest,
  AuditLogEntry,
  RequestStatus,
  InvoiceData,
  PaymentData,
  ExpenseItem,
  ExpenseCategory,
  RefundData,
  CadastroPrestador,
  NotaFiscalEquipe,
  ComprovanteServico,
  AuditoriaEntry,
} from '../types';
import { auth, googleProvider, getProvisioningAuth } from '../firebase';
import {
  atualizarNotaFirestore,
  atualizarStatusCadastroFirestore,
  criarCadastroPublicoFirestore,
  criarComprovanteFirestore,
  criarNotaFirestore,
  excluirComprovanteFirestore,
  excluirNotaFirestore,
  fetchUserProfileFirestore,
  getAuthenticatedDownloadUrl,
  markFirstLoginDoneFirestore,
  registrarAuditoriaFirestore,
  subscribeTeamCollections,
  uploadAuthenticatedFile,
  uploadRequestFiles,
  upsertRequestFirestore,
  upsertUserFirestore,
} from '../services/firebaseService';

/** E-mail do administrador inicial (precisa coincidir com o das regras do Firestore/Storage). */
const BOOTSTRAP_ADMIN_EMAIL = 'blabluki@gmail.com';
const DEFAULT_PASSWORD = 'ameta123';

type AuthResult = { ok: boolean; error?: string };

interface AppContextType {
  users: User[];
  requests: AdvanceRequest[];
  cadastros: CadastroPrestador[];
  notasEquipe: NotaFiscalEquipe[];
  comprovantes: ComprovanteServico[];
  auditoria: AuditoriaEntry[];
  currentUser: User | null;
  /** false enquanto o Firebase ainda está verificando se existe uma sessão ativa. */
  authReady: boolean;
  /** Mensagem de erro de sincronização/permissão com o Firebase (null quando está tudo certo). */
  syncError: string | null;
  dismissSyncError: () => void;
  login: (email: string, pass: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => void;
  changePassword: (newPass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  activeRole: 'operador' | 'financeiro';

  // Advance Request Actions
  createRequest: (data: {
    destination: string;
    startDate: string;
    endDate: string;
    purpose: string;
    description: string;
    activities?: string;
    amountRequested?: number;
  }) => void;
  approveRequest: (id: string, comment?: string, approvedAmount?: number) => void;
  rejectRequest: (id: string, reason: string) => void;
  returnRequestForAdjustment: (id: string, reason: string) => void;
  authorizeInvoice: (id: string, observation: string) => void;
  submitInvoice: (id: string, invoice: Omit<InvoiceData, 'status'>) => void;
  reviewInvoice: (id: string, approved: boolean, comment?: string) => void;
  registerPayment: (id: string, payment: PaymentData) => void;
  submitAccountability: (id: string, expenses: ExpenseItem[]) => void;
  reviewAccountabilityExpense: (
    requestId: string,
    expenseId: string,
    approved: boolean,
    reviewComment?: string
  ) => void;
  reviewAccountability: (id: string, approved: boolean, comment?: string) => void;
  registerRefund: (id: string, refund: RefundData) => void;
  approveReimbursement: (id: string) => void;
  finalizeAccountability: (id: string) => void;
  finalizeActivity: (requestId: string) => void;

  // User Management
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'active'>) => Promise<void>;
  updateUser: (
    userId: string,
    updates: Partial<
      Pick<User, 'name' | 'email' | 'cpfCnpj' | 'phone' | 'role' | 'active' | 'isFirstLogin'>
    >
  ) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;

  // Public Cadastro & Teams Workflow
  createCadastro: (
    campos16: Omit<
      CadastroPrestador,
      'id' | 'status' | 'criadoEm' | 'concluidoEm' | 'concluidoPorUid' | 'concluidoPorNome'
    >
  ) => Promise<CadastroPrestador>;
  concluirCadastro: (cadastroId: string) => Promise<void>;
  createNotaEquipe: (
    data: {
      prestadorId: string;
      numero: string;
      dataEmissao: string;
      valor: number;
      descricao: string;
      observacoes?: string;
    },
    file?: File | null,
    onProgress?: (pct: number) => void
  ) => Promise<NotaFiscalEquipe>;
  updateNotaEquipe: (
    notaId: string,
    updates: {
      numero: string;
      dataEmissao: string;
      valor: number;
      descricao: string;
      observacoes?: string;
    },
    file?: File | null,
    onProgress?: (pct: number) => void
  ) => Promise<void>;
  releaseNotaForComprovante: (notaId: string) => Promise<void>;
  deleteNotaEquipe: (notaId: string) => Promise<void>;
  createComprovante: (
    data: {
      notaId?: string;
      requestId?: string;
      prestadorId?: string;
      categoria?: ExpenseCategory;
      valor?: number;
      descricao: string;
      data: string;
    },
    file: File,
    onProgress?: (pct: number) => void
  ) => Promise<ComprovanteServico>;
  deleteComprovante: (comprovanteId: string) => Promise<void>;
  logDownloadAuditoria: (
    entidade: AuditoriaEntry['entidade'],
    entidadeId: string,
    detalhes: string
  ) => Promise<void>;
  resolveAuthenticatedStorageUrl: (arquivoPath?: string) => Promise<string | null>;

  // Notifications (apenas em memória: avisos da sessão atual)
  notifications: Array<{ id: string; title: string; message: string; date: string; read: boolean }>;
  markNotificationAsRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** Texto legível a partir de qualquer erro (inclui o JSON lançado por handleFirestoreError). */
function errorText(err: unknown): string {
  if (err instanceof Error) {
    let message = err.message;
    try {
      const parsed = JSON.parse(err.message) as { error?: string };
      if (parsed && typeof parsed.error === 'string') message = parsed.error;
    } catch {
      // não era JSON: usa a mensagem original
    }
    if (/permission|insufficient/i.test(message)) {
      return 'sem permissão (regras de segurança do Firebase negaram a operação)';
    }
    return message;
  }
  return String(err);
}

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'E-mail ou senha inválidos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    case 'auth/operation-not-allowed':
      return 'Este método de login não está ativado no Firebase (Console → Authentication → Método de login).';
    case 'auth/unauthorized-domain':
      return 'Este endereço do site não está autorizado no Firebase (Console → Authentication → Configurações → Domínios autorizados).';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Login com Google cancelado.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela do Google. Libere os pop-ups e tente de novo.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta no Firebase Authentication com este e-mail. Use a redefinição de senha ou remova a conta antiga no console do Firebase.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/requires-recent-login':
      return 'Por segurança, saia do sistema, entre novamente e repita a operação.';
    case 'auth/network-request-failed':
      return 'Falha de rede ao falar com o Firebase.';
    default:
      return err instanceof Error ? err.message : 'Falha na autenticação.';
  }
}

/** Solicitações de vistoriador AMETA nunca passam por NF: normaliza status antigos. */
function normalizeRequest(r: AdvanceRequest): AdvanceRequest {
  const isAmeta = r.requesterRole === 'vistoria_ameta';
  if (
    isAmeta &&
    (r.status === 'Em análise financeira' || r.status === 'Autorizado emitir Nota Fiscal')
  ) {
    return { ...r, status: 'Aguardando comprovante' as RequestStatus };
  }
  return r;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [cadastros, setCadastros] = useState<CadastroPrestador[]>([]);
  const [notasEquipe, setNotasEquipe] = useState<NotaFiscalEquipe[]>([]);
  const [comprovantes, setComprovantes] = useState<ComprovanteServico[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; date: string; read: boolean }>
  >([]);

  const activeRole: 'operador' | 'financeiro' =
    currentUser?.role === 'operador' ? 'operador' : 'financeiro';

  const dismissSyncError = () => setSyncError(null);

  const reportError = (message: string, err: unknown) => {
    console.error(message, err);
    setSyncError(`${message}: ${errorText(err)}`);
  };

  // Sessão do Firebase Auth → perfil no Firestore → escutas em tempo real
  useEffect(() => {
    let unsubData: (() => void) | null = null;
    const stopData = () => {
      if (unsubData) {
        unsubData();
        unsubData = null;
      }
    };

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      stopData();

      if (!fbUser) {
        setCurrentUser(null);
        setUsers([]);
        setRequests([]);
        setCadastros([]);
        setNotasEquipe([]);
        setComprovantes([]);
        setAuditoria([]);
        setAuthReady(true);
        return;
      }

      try {
        let profile = await fetchUserProfileFirestore(fbUser.uid);

        if (!profile && fbUser.email === BOOTSTRAP_ADMIN_EMAIL && fbUser.emailVerified) {
          const adminBootstrap: User = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Administrador AMETA',
            email: fbUser.email,
            cpfCnpj: '',
            phone: '',
            role: 'admin',
            active: true,
            ativo: true,
            createdAt: new Date().toISOString().slice(0, 10),
            isFirstLogin: false,
          };
          await upsertUserFirestore(adminBootstrap);
          profile = adminBootstrap;
        }

        if (!profile) {
          setSyncError(
            'Conta autenticada, mas ainda sem acesso liberado. Peça ao Administrador para cadastrar este e-mail em Usuários.'
          );
          await signOut(auth);
          return;
        }

        if (!profile.active) {
          setSyncError('Este usuário está desativado no sistema.');
          await signOut(auth);
          return;
        }

        setCurrentUser(profile);
        unsubData = subscribeTeamCollections({
          role: profile.role,
          onCadastros: setCadastros,
          onNotas: setNotasEquipe,
          onComprovantes: setComprovantes,
          onAuditoria: setAuditoria,
          onRequests: (items) => setRequests(items.map(normalizeRequest)),
          onUsers: setUsers,
          onError: (name, err) =>
            reportError(`Não foi possível ler "${name}" do Firebase`, err),
        });
      } catch (err) {
        reportError('Não foi possível carregar seu perfil no Firebase', err);
        await signOut(auth).catch(() => {});
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsubAuth();
      stopData();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== AUTENTICAÇÃO ====================
  const login = async (email: string, pass: string): Promise<AuthResult> => {
    try {
      setSyncError(null);
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyAuthError(err) };
    }
  };

  const loginWithGoogle = async (): Promise<AuthResult> => {
    try {
      setSyncError(null);
      await signInWithPopup(auth, googleProvider);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyAuthError(err) };
    }
  };

  const logout = () => {
    signOut(auth).catch((err) => console.error('Erro ao sair:', err));
  };

  const changePassword = async (newPass: string): Promise<void> => {
    const fbUser = auth.currentUser;
    if (!fbUser || !currentUser) throw new Error('Usuário não autenticado.');
    try {
      await updatePassword(fbUser, newPass);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
    try {
      await markFirstLoginDoneFirestore(currentUser.id);
    } catch (err) {
      throw new Error(errorText(err));
    }
    setCurrentUser({ ...currentUser, isFirstLogin: false });
    addNotification('Senha Alterada', 'Sua senha foi alterada com sucesso.');
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  };

  // ==================== NOTIFICAÇÕES / AUDITORIA ====================
  const addNotification = (title: string, message: string) => {
    const newNotif = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      title,
      message,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const appendAuditoria = async (
    acao: string,
    entidade: AuditoriaEntry['entidade'],
    entidadeId: string,
    detalhes?: string
  ) => {
    if (!currentUser) return;
    try {
      await registrarAuditoriaFirestore({
        acao,
        entidade,
        entidadeId,
        detalhes,
        autorUid: currentUser.id,
        autorNome: currentUser.name,
        autorRole: currentUser.role,
      });
    } catch (err) {
      reportError('Não foi possível registrar a auditoria no Firebase', err);
    }
  };

  // ==================== SOLICITAÇÕES DE ADIANTAMENTO ====================
  /**
   * Grava uma solicitação no Firebase: mostra a mudança na tela na hora e, em seguida,
   * envia os anexos ao Storage e salva o documento no Firestore.
   * Se algo falhar, o erro aparece no aviso vermelho do topo (syncError).
   */
  const persistRequest = async (updated: AdvanceRequest): Promise<void> => {
    setRequests((prev) =>
      prev.some((r) => r.id === updated.id)
        ? prev.map((r) => (r.id === updated.id ? updated : r))
        : [updated, ...prev]
    );
    try {
      const withFiles = await uploadRequestFiles(updated);
      await upsertRequestFirestore(withFiles);
    } catch (err) {
      reportError('A alteração NÃO foi salva no Firebase', err);
    }
  };

  /** Devolve a solicitação com uma nova entrada no histórico (e, opcionalmente, novo status). */
  const withHistory = (
    req: AdvanceRequest,
    title: string,
    opts: { comment?: string; statusAfter?: RequestStatus; patch?: Partial<AdvanceRequest> } = {}
  ): AdvanceRequest => {
    const entry: AuditLogEntry = {
      id: 'h-' + Date.now() + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      authorId: currentUser?.id || 'sistema',
      authorName: currentUser?.name || 'Sistema',
      authorRole: currentUser?.role || 'admin',
      title,
      comment: opts.comment,
      statusBefore: req.status,
      statusAfter: opts.statusAfter,
    };
    return {
      ...req,
      ...opts.patch,
      status: opts.statusAfter ?? req.status,
      history: [entry, ...req.history],
    };
  };

  const nextRequestCode = (): string => {
    const prefix = `ADV-${new Date().getFullYear()}-`;
    const max = requests.reduce((acc, r) => {
      if (!r.code || !r.code.startsWith(prefix)) return acc;
      const n = parseInt(r.code.slice(prefix.length), 10);
      return Number.isNaN(n) ? acc : Math.max(acc, n);
    }, 0);
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  };

  const createRequest = (data: {
    destination: string;
    startDate: string;
    endDate: string;
    purpose: string;
    description: string;
    activities?: string;
    amountRequested?: number;
  }) => {
    if (!currentUser) return;
    const newCode = nextRequestCode();
    const now = new Date().toISOString();
    const newReq: AdvanceRequest = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      code: newCode,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      requesterRole: currentUser.role,
      destination: data.destination,
      startDate: data.startDate,
      endDate: data.endDate,
      purpose: data.purpose,
      description: data.description,
      activities: data.activities,
      amountRequested: data.amountRequested ?? 0,
      status: 'Solicitação enviada',
      createdAt: now,
      history: [
        {
          id: 'h-' + Date.now(),
          date: now,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          title: 'Solicitação Criada e Enviada',
          comment: data.activities ? `Atividades: ${data.activities}` : undefined,
          statusAfter: 'Solicitação enviada',
        },
      ],
    };
    void persistRequest(newReq);
    addNotification('Nova Solicitação', `Solicitação ${newCode} enviada para análise.`);
  };

  const approveRequest = (id: string, comment?: string, approvedAmount?: number) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const isAmeta =
      req.requesterRole === 'vistoria_ameta' ||
      users.find((u) => u.id === req.operatorId)?.role === 'vistoria_ameta';

    const validAmount =
      approvedAmount !== undefined && !Number.isNaN(approvedAmount) && approvedAmount > 0
        ? approvedAmount
        : undefined;

    const nextStatus: RequestStatus = isAmeta ? 'Aguardando comprovante' : 'Em análise financeira';
    const actionTitle = isAmeta
      ? 'Solicitação Aprovada pelo Coordenador (Sem NF - Direto para Comprovantes)'
      : 'Solicitação Aprovada pelo Coordenador / Financeiro';

    const amountNote = validAmount
      ? `Valor definido pelo Coordenador: R$ ${validAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : '';
    const fullComment = [amountNote, comment].filter(Boolean).join(' — ') || undefined;

    void persistRequest(
      withHistory(req, actionTitle, {
        comment: fullComment,
        statusAfter: nextStatus,
        patch: { amountRequested: validAmount !== undefined ? validAmount : req.amountRequested },
      })
    );

    addNotification(
      'Solicitação Aprovada',
      isAmeta
        ? `A solicitação ${req.code} foi aprovada sem necessidade de Nota Fiscal, direcionada aos comprovantes para conferência.`
        : validAmount
        ? `A solicitação ${req.code} foi aprovada com valor de R$ ${validAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
        : `A solicitação ${req.code} foi aprovada.`
    );
  };

  const rejectRequest = (id: string, reason: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    void persistRequest(
      withHistory(req, 'Solicitação Rejeitada', { comment: reason, statusAfter: 'Rejeitado' })
    );
    addNotification('Solicitação Rejeitada', `A solicitação ${req.code} foi rejeitada.`);
  };

  const returnRequestForAdjustment = (id: string, reason: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    void persistRequest(
      withHistory(req, 'Solicitação Devolvida para Ajustes', {
        comment: reason,
        statusAfter: 'Aguardando ajustes',
      })
    );
    addNotification('Ajustes Solicitados', `A solicitação ${req.code} precisa de ajustes.`);
  };

  const authorizeInvoice = (id: string, observation: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    void persistRequest(
      withHistory(req, 'Emissão de Nota Fiscal Autorizada', {
        comment: observation,
        statusAfter: 'Autorizado emitir Nota Fiscal',
        patch: { invoiceAuthorized: true, invoiceObservation: observation },
      })
    );
    addNotification('NF Autorizada', `Emissão de Nota Fiscal autorizada para ${req.code}.`);
  };

  const submitInvoice = (id: string, invoiceData: Omit<InvoiceData, 'status'>) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const fullInvoice: InvoiceData = { ...invoiceData, status: 'pendente' };
    void persistRequest(
      withHistory(req, 'Nota Fiscal Enviada para Conferência', {
        comment: `NF nº ${invoiceData.number} enviada.`,
        statusAfter: 'Nota Fiscal em conferência',
        patch: { invoice: fullInvoice },
      })
    );
    addNotification(
      'NF Enviada',
      `Nota Fiscal da solicitação ${req.code} enviada para conferência.`
    );
  };

  const reviewInvoice = (id: string, approved: boolean, comment?: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const newStatus: RequestStatus = approved
      ? 'Aguardando pagamento'
      : 'Nota Fiscal devolvida para correção';
    void persistRequest(
      withHistory(
        req,
        approved ? 'Nota Fiscal Aprovada' : 'Nota Fiscal Devolvida para Correção',
        {
          comment,
          statusAfter: newStatus,
          patch: {
            invoice: req.invoice
              ? {
                  ...req.invoice,
                  status: approved ? 'aprovado' : 'devolvido',
                  reviewComment: comment,
                }
              : undefined,
          },
        }
      )
    );
    addNotification(
      approved ? 'NF Aprovada' : 'NF Devolvida',
      `Nota Fiscal de ${req.code} foi ${approved ? 'aprovada' : 'devolvida'}.`
    );
  };

  const registerPayment = (id: string, paymentData: PaymentData) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    void persistRequest(
      withHistory(req, 'Pagamento Registrado', {
        comment: `Valor de R$ ${paymentData.amountPaid.toFixed(2)} pago via ${paymentData.method}.`,
        statusAfter: 'Pago',
        patch: { payment: paymentData },
      })
    );
    addNotification('Pagamento Efetuado', `Pagamento da solicitação ${req.code} registrado.`);
  };

  const submitAccountability = (id: string, expenses: ExpenseItem[]) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const totalExpenses = expenses.reduce((acc, item) => acc + item.amount, 0);
    const diff = req.amountRequested - totalExpenses;
    let balanceType: 'saldo_a_devolver' | 'excedente' | 'zerado' = 'zerado';
    const balanceAmount = Math.abs(diff);

    if (diff > 0) {
      balanceType = 'saldo_a_devolver';
    } else if (diff < 0) {
      balanceType = 'excedente';
    }

    const accountabilityData = {
      expenses: expenses.map((e) => ({ ...e, approved: true })),
      totalExpenses,
      balanceType,
      balanceAmount,
      reimbursementStatus: balanceType === 'excedente' ? ('pendente' as const) : undefined,
    };

    void persistRequest(
      withHistory(req, 'Prestação de Contas Enviada', {
        comment: `Total de despesas: R$ ${totalExpenses.toFixed(2)}.`,
        statusAfter: 'Prestação em análise',
        patch: { accountability: accountabilityData },
      })
    );
    addNotification(
      'Prestação Enviada',
      `Prestação de contas de ${req.code} enviada para análise.`
    );
  };

  const reviewAccountabilityExpense = (
    requestId: string,
    expenseId: string,
    approved: boolean,
    reviewComment?: string
  ) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req || !req.accountability) return;

    const updatedExpenses = req.accountability.expenses.map((e) =>
      e.id === expenseId ? { ...e, approved, reviewComment } : e
    );
    const totalExpenses = updatedExpenses
      .filter((e) => e.approved !== false)
      .reduce((acc, item) => acc + item.amount, 0);
    const diff = req.amountRequested - totalExpenses;
    let balanceType: 'saldo_a_devolver' | 'excedente' | 'zerado' = 'zerado';
    const balanceAmount = Math.abs(diff);
    if (diff > 0) balanceType = 'saldo_a_devolver';
    else if (diff < 0) balanceType = 'excedente';

    void persistRequest({
      ...req,
      accountability: {
        ...req.accountability,
        expenses: updatedExpenses,
        totalExpenses,
        balanceType,
        balanceAmount,
      },
    });
  };

  const finalizeActivity = (requestId: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;
    void persistRequest(
      withHistory(req, 'Atividade Finalizada', {
        comment: 'Vistoriador AMETA finalizou a atividade com os comprovantes anexados.',
        statusAfter: 'Finalizado',
      })
    );
    addNotification('Atividade Finalizada', `A solicitação ${req.code} foi finalizada com sucesso.`);
  };

  const reviewAccountability = (id: string, approved: boolean, comment?: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req || !req.accountability) return;

    let nextStatus: RequestStatus = 'Finalizado';
    if (!approved) {
      nextStatus = 'Prestação devolvida para ajustes';
    } else if (req.accountability.balanceType === 'saldo_a_devolver') {
      nextStatus = 'Aguardando devolução de saldo';
    } else if (req.accountability.balanceType === 'excedente') {
      nextStatus = 'Aguardando aprovação de reembolso';
    }

    void persistRequest(
      withHistory(
        req,
        approved ? 'Prestação de Contas Aprovada' : 'Prestação Devolvida para Ajustes',
        { comment, statusAfter: nextStatus }
      )
    );
    addNotification(
      'Prestação Analisada',
      `Prestação de ${req.code} foi ${approved ? 'aprovada' : 'devolvida'}.`
    );
  };

  const registerRefund = (id: string, refundData: RefundData) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req || !req.accountability) return;
    void persistRequest(
      withHistory(req, 'Devolução de Saldo Registrada', {
        comment: `Valor devolvido: R$ ${refundData.amount.toFixed(2)} via ${refundData.method}.`,
        statusAfter: 'Finalizado',
        patch: { accountability: { ...req.accountability, refundDetails: refundData } },
      })
    );
    addNotification(
      'Devolução Registrada',
      `Devolução de saldo para ${req.code} registrada e processo finalizado.`
    );
  };

  const approveReimbursement = (id: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req || !req.accountability) return;
    void persistRequest(
      withHistory(req, 'Reembolso de Excedente Aprovado e Finalizado', {
        comment: 'Reembolso autorizado para pagamento.',
        statusAfter: 'Finalizado',
        patch: { accountability: { ...req.accountability, reimbursementStatus: 'aprovado' } },
      })
    );
    addNotification('Reembolso Aprovado', `Reembolso excedente para ${req.code} aprovado.`);
  };

  const finalizeAccountability = (id: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    void persistRequest(
      withHistory(req, 'Prestação Finalizada', {
        comment: 'Todas as pendências financeiras foram resolvidas.',
        statusAfter: 'Finalizado',
      })
    );
    addNotification('Processo Finalizado', `Solicitação ${req.code} totalmente finalizada.`);
  };

  // ==================== USUÁRIOS ====================
  const addUser = async (userData: Omit<User, 'id' | 'createdAt' | 'active'>): Promise<void> => {
    const customPass = userData.password?.trim();
    const password = customPass || DEFAULT_PASSWORD;
    if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');

    // 1) cria a conta de login no Firebase Authentication (numa instância separada,
    //    para o administrador não ser deslogado)
    const provisioningAuth = getProvisioningAuth();
    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(
        provisioningAuth,
        userData.email.trim(),
        password
      );
      uid = cred.user.uid;
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    } finally {
      await signOut(provisioningAuth).catch(() => {});
    }

    // 2) grava o perfil/permissões no Firestore (a senha NUNCA é gravada)
    const newUser: User = {
      id: uid,
      name: userData.name,
      email: userData.email.trim(),
      cpfCnpj: userData.cpfCnpj || '',
      phone: userData.phone || '',
      role: userData.role,
      active: true,
      ativo: true,
      createdAt: new Date().toISOString().substring(0, 10),
      isFirstLogin: !customPass,
    };
    try {
      await upsertUserFirestore(newUser);
    } catch (err) {
      throw new Error(
        `A conta de login foi criada, mas o perfil não foi salvo no Firestore: ${errorText(err)}`
      );
    }
    addNotification(
      'Usuário Cadastrado',
      customPass
        ? `Novo usuário ${newUser.name} cadastrado com senha personalizada.`
        : `Novo usuário ${newUser.name} cadastrado com senha padrão '${DEFAULT_PASSWORD}'.`
    );
  };

  const updateUser = async (
    userId: string,
    updates: Partial<
      Pick<User, 'name' | 'email' | 'cpfCnpj' | 'phone' | 'role' | 'active' | 'isFirstLogin'>
    >
  ): Promise<void> => {
    const existing = users.find((u) => u.id === userId);
    if (!existing) throw new Error('Usuário não encontrado.');
    const active = updates.active !== undefined ? updates.active : existing.active;
    const updated: User = { ...existing, ...updates, active, ativo: active };
    try {
      await upsertUserFirestore(updated);
    } catch (err) {
      throw new Error(errorText(err));
    }
    addNotification('Usuário Atualizado', 'Dados e perfil de acesso atualizados com sucesso.');
  };

  const toggleUserStatus = async (userId: string): Promise<void> => {
    const existing = users.find((u) => u.id === userId);
    if (!existing) return;
    try {
      await upsertUserFirestore({ ...existing, active: !existing.active, ativo: !existing.active });
    } catch (err) {
      reportError('Não foi possível alterar a situação do usuário', err);
    }
  };

  // ==================== CADASTRO PÚBLICO & FLUXO DAS EQUIPES ====================
  const createCadastro = async (
    campos16: Omit<
      CadastroPrestador,
      'id' | 'status' | 'criadoEm' | 'concluidoEm' | 'concluidoPorUid' | 'concluidoPorNome'
    >
  ): Promise<CadastroPrestador> => {
    const id = 'cad-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    try {
      await criarCadastroPublicoFirestore(id, campos16);
    } catch (err) {
      console.error('Falha ao salvar o cadastro público no Firestore:', err);
      throw new Error(
        'Não foi possível enviar o cadastro agora. Confira os dados e tente novamente.'
      );
    }
    addNotification(
      'Novo Cadastro de Prestador',
      `${campos16.nome} (${campos16.empresa}) enviou o formulário público.`
    );
    return {
      ...campos16,
      id,
      status: 'Pendente',
      criadoEm: new Date().toISOString(),
    };
  };

  const concluirCadastro = async (cadastroId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'financeiro')) return;
    const alvo = cadastros.find((c) => c.id === cadastroId);
    try {
      await atualizarStatusCadastroFirestore(cadastroId, {
        status: 'Concluído',
        concluidoPorUid: currentUser.id,
        concluidoPorNome: currentUser.name,
      });
    } catch (err) {
      reportError('Não foi possível concluir o cadastro no Firebase', err);
      return;
    }
    await appendAuditoria(
      'Cadastro concluído',
      'cadastro',
      cadastroId,
      `Cadastro de ${alvo?.nome || cadastroId} marcado como Concluído por ${currentUser.name}`
    );
    addNotification('Cadastro Concluído', `Cadastro de ${alvo?.nome || ''} foi concluído.`);
  };

  const createNotaEquipe = async (
    data: {
      prestadorId: string;
      numero: string;
      dataEmissao: string;
      valor: number;
      descricao: string;
      observacoes?: string;
    },
    file?: File | null,
    onProgress?: (pct: number) => void
  ): Promise<NotaFiscalEquipe> => {
    if (!currentUser) throw new Error('Usuário não autenticado.');
    const prestador = cadastros.find((c) => c.id === data.prestadorId);
    if (!prestador) throw new Error('Prestador selecionado não encontrado.');

    const notaId = 'nf-eq-' + Date.now();
    let arquivoPath: string | undefined;
    let arquivoNome: string | undefined;

    if (file) {
      try {
        const up = await uploadAuthenticatedFile('notas', notaId, file, onProgress);
        arquivoPath = up.arquivoPath;
        arquivoNome = up.arquivoNome;
      } catch (err) {
        throw new Error(`Falha ao enviar o arquivo para o Storage: ${errorText(err)}`);
      }
    }

    const now = new Date().toISOString();
    const novaNota: NotaFiscalEquipe = {
      id: notaId,
      prestadorId: prestador.id,
      prestadorNome: prestador.nome,
      prestadorCnpj: prestador.cnpj,
      prestadorEmpresa: prestador.empresa,
      prestadorFuncao: prestador.funcao,
      numero: data.numero.trim(),
      dataEmissao: data.dataEmissao,
      valor: Number(data.valor),
      descricao: data.descricao.trim(),
      observacoes: data.observacoes?.trim() || undefined,
      arquivoPath,
      arquivoNome,
      status: 'Emitida',
      criadoPorUid: currentUser.id,
      criadoPorNome: currentUser.name,
      criadoEm: now,
      atualizadoEm: now,
    };

    try {
      await criarNotaFirestore(novaNota);
    } catch (err) {
      throw new Error(`Não foi possível salvar a nota no Firebase: ${errorText(err)}`);
    }

    await appendAuditoria(
      'Nota fiscal criada',
      'nota',
      notaId,
      `Nota ${novaNota.numero} emitida antes do serviço para ${prestador.nome} (R$ ${novaNota.valor.toFixed(2)})`
    );

    addNotification(
      'Nota Fiscal Registrada',
      `Nota ${novaNota.numero} registrada para ${prestador.nome}.`
    );
    return novaNota;
  };

  const updateNotaEquipe = async (
    notaId: string,
    updates: {
      numero: string;
      dataEmissao: string;
      valor: number;
      descricao: string;
      observacoes?: string;
    },
    file?: File | null,
    onProgress?: (pct: number) => void
  ) => {
    if (!currentUser) return;
    const existing = notasEquipe.find((n) => n.id === notaId);
    if (!existing) return;

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'financeiro';
    if (!isAdmin && (existing.criadoPorUid !== currentUser.id || existing.status !== 'Emitida')) {
      throw new Error('Você só pode editar notas criadas por você enquanto estiverem Emitida.');
    }

    let arquivoPath = existing.arquivoPath;
    let arquivoNome = existing.arquivoNome;

    if (file) {
      try {
        const up = await uploadAuthenticatedFile('notas', notaId, file, onProgress);
        arquivoPath = up.arquivoPath;
        arquivoNome = up.arquivoNome;
      } catch (err) {
        throw new Error(`Falha ao enviar o arquivo para o Storage: ${errorText(err)}`);
      }
    }

    try {
      await atualizarNotaFirestore(notaId, { ...updates, arquivoPath, arquivoNome });
    } catch (err) {
      throw new Error(`Não foi possível atualizar a nota no Firebase: ${errorText(err)}`);
    }

    await appendAuditoria(
      'Nota fiscal editada',
      'nota',
      notaId,
      `Nota ${updates.numero} atualizada por ${currentUser.name}`
    );
    addNotification('Nota Atualizada', `Nota ${updates.numero} atualizada com sucesso.`);
  };

  const releaseNotaForComprovante = async (notaId: string) => {
    if (!currentUser) return;
    const existing = notasEquipe.find((n) => n.id === notaId);
    if (!existing) return;

    try {
      await atualizarNotaFirestore(notaId, { status: 'Aguardando comprovante' });
    } catch (err) {
      reportError('Não foi possível liberar a nota para comprovante', err);
      return;
    }

    // Só Financeiro/Coordenação podem alterar o status do cadastro (regras do Firestore).
    const prestador = cadastros.find((c) => c.id === existing.prestadorId);
    if (
      prestador &&
      prestador.status === 'Pendente' &&
      (currentUser.role === 'admin' || currentUser.role === 'financeiro')
    ) {
      try {
        await atualizarStatusCadastroFirestore(prestador.id, { status: 'Em andamento' });
      } catch (err) {
        reportError('Não foi possível atualizar o status do cadastro', err);
      }
    }

    await appendAuditoria(
      'Nota liberada para comprovante',
      'nota',
      notaId,
      `Nota ${existing.numero} encaminhada para a Equipe Vistoria Ameta – Comprovantes`
    );
    addNotification(
      'Liberada para Comprovantes',
      `Nota ${existing.numero} agora aguarda comprovante da Equipe Ameta.`
    );
  };

  const deleteNotaEquipe = async (notaId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'financeiro')) return;
    const target = notasEquipe.find((n) => n.id === notaId);
    try {
      await excluirNotaFirestore(notaId, target?.arquivoPath);
    } catch (err) {
      reportError('Não foi possível excluir a nota no Firebase', err);
      return;
    }
    await appendAuditoria(
      'Nota fiscal excluída',
      'nota',
      notaId,
      `Nota ${target?.numero || notaId} removida pelo administrador`
    );
  };

  const createComprovante = async (
    data: {
      notaId?: string;
      requestId?: string;
      prestadorId?: string;
      categoria?: ExpenseCategory;
      valor?: number;
      descricao: string;
      data: string;
    },
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<ComprovanteServico> => {
    if (!currentUser) throw new Error('Usuário não autenticado.');
    const nota = data.notaId ? notasEquipe.find((n) => n.id === data.notaId) : null;
    const req = data.requestId ? requests.find((r) => r.id === data.requestId) : null;
    if (!nota && !req) throw new Error('É obrigatório existir uma nota fiscal ou solicitação vinculada.');

    const compId = 'comp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
    const folderId = nota ? nota.id : req?.id || 'geral';

    let arquivoPath = '';
    let arquivoNome = file.name;
    try {
      const up = await uploadAuthenticatedFile('comprovantes', folderId, file, onProgress);
      arquivoPath = up.arquivoPath;
      arquivoNome = up.arquivoNome;
    } catch (err) {
      throw new Error(`Falha ao enviar o arquivo para o Storage: ${errorText(err)}`);
    }

    const validMime: ComprovanteServico['tipo'] =
      file.type === 'image/jpeg' || file.type === 'image/png' ? file.type : 'application/pdf';

    const novoComp: ComprovanteServico = {
      id: compId,
      notaId: nota?.id,
      requestId: req?.id,
      prestadorId: data.prestadorId || req?.operatorId,
      prestadorName: req?.operatorName || nota?.prestadorNome,
      categoria: data.categoria,
      valor: data.valor !== undefined ? Number(data.valor) : undefined,
      descricao: data.descricao.trim(),
      data: data.data,
      arquivoPath,
      arquivoNome,
      tipo: validMime,
      tamanho: file.size,
      criadoPorUid: currentUser.id,
      criadoPorNome: currentUser.name,
      criadoEm: new Date().toISOString(),
    };

    try {
      await criarComprovanteFirestore(novoComp);
    } catch (err) {
      throw new Error(`Não foi possível salvar o comprovante no Firebase: ${errorText(err)}`);
    }

    if (nota && nota.status !== 'Comprovada') {
      try {
        await atualizarNotaFirestore(nota.id, { status: 'Comprovada' });
      } catch (err) {
        reportError('O comprovante foi salvo, mas não foi possível marcar a nota como Comprovada', err);
      }
    }

    await appendAuditoria(
      'Comprovante enviado',
      'comprovante',
      compId,
      `Comprovante ${arquivoNome} anexado a ${nota ? `nota ${nota.numero}` : `solicitação ${req?.code}`}`
    );

    addNotification('Comprovante Enviado', `Comprovante ${arquivoNome} anexado com sucesso.`);
    return novoComp;
  };

  const deleteComprovante = async (comprovanteId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'financeiro')) return;
    const target = comprovantes.find((c) => c.id === comprovanteId);
    try {
      await excluirComprovanteFirestore(comprovanteId, target?.arquivoPath);
    } catch (err) {
      reportError('Não foi possível excluir o comprovante no Firebase', err);
      return;
    }
    await appendAuditoria(
      'Comprovante excluído',
      'comprovante',
      comprovanteId,
      `Comprovante ${target?.arquivoNome || comprovanteId} excluído pelo administrador`
    );
  };

  const logDownloadAuditoria = async (
    entidade: AuditoriaEntry['entidade'],
    entidadeId: string,
    detalhes: string
  ) => {
    await appendAuditoria('Download de arquivo', entidade, entidadeId, detalhes);
  };

  const resolveAuthenticatedStorageUrl = async (arquivoPath?: string): Promise<string | null> => {
    if (!arquivoPath || !auth.currentUser) return null;
    try {
      return await getAuthenticatedDownloadUrl(arquivoPath);
    } catch (err) {
      console.error('Não foi possível obter o link do arquivo no Storage:', err);
      return null;
    }
  };

  return (
    <AppContext.Provider
      value={{
        users,
        requests,
        cadastros,
        notasEquipe,
        comprovantes,
        auditoria,
        currentUser,
        authReady,
        syncError,
        dismissSyncError,
        login,
        loginWithGoogle,
        logout,
        changePassword,
        sendPasswordReset,
        activeRole,
        createRequest,
        approveRequest,
        rejectRequest,
        returnRequestForAdjustment,
        authorizeInvoice,
        submitInvoice,
        reviewInvoice,
        registerPayment,
        submitAccountability,
        reviewAccountabilityExpense,
        reviewAccountability,
        registerRefund,
        approveReimbursement,
        finalizeAccountability,
        finalizeActivity,
        addUser,
        updateUser,
        toggleUserStatus,
        createCadastro,
        concluirCadastro,
        createNotaEquipe,
        updateNotaEquipe,
        releaseNotaForComprovante,
        deleteNotaEquipe,
        createComprovante,
        deleteComprovante,
        logDownloadAuditoria,
        resolveAuthenticatedStorageUrl,
        notifications,
        markNotificationAsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
