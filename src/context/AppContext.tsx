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
  AppNotification,
  UserRole,
} from '../types';
import { auth, googleProvider, getProvisioningAuth } from '../firebase';
import {
  atualizarNotaFirestore,
  atualizarStatusCadastroFirestore,
  criarCadastroPublicoFirestore,
  criarComprovanteFirestore,
  criarNotaFirestore,
  criarNotificacaoFirestore,
  excluirComprovanteFirestore,
  excluirNotaFirestore,
  fetchUserProfileFirestore,
  getAuthenticatedDownloadUrl,
  marcarNotificacaoLidaFirestore,
  markFirstLoginDoneFirestore,
  registrarAuditoriaFirestore,
  subscribeTeamCollections,
  uploadAuthenticatedFile,
  uploadRequestFiles,
  upsertRequestFirestore,
  upsertUserFirestore,
} from '../services/firebaseService';
import { prepareUploadFile } from '../utils/fileHelpers';

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
  submitInvoice: (id: string, invoice: Omit<InvoiceData, 'status'>) => Promise<boolean>;
  reviewInvoice: (id: string, approved: boolean, comment?: string) => void;
  registerPayment: (id: string, payment: PaymentData) => Promise<boolean>;
  submitAccountability: (id: string, expenses: ExpenseItem[]) => Promise<boolean>;
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

  // Notifications (direcionadas apenas ao usuário ou perfil destinatário)
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
        setNotifications([]);
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
          uid: profile.id,
          role: profile.role,
          onCadastros: setCadastros,
          onNotas: setNotasEquipe,
          onComprovantes: setComprovantes,
          onAuditoria: setAuditoria,
          onRequests: (items) => setRequests(items.map(normalizeRequest)),
          onUsers: setUsers,
          onNotifications: setNotifications,
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
    setNotifications([]);
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
    addNotification('Senha Alterada', 'Sua senha foi alterada com sucesso.', {
      recipientUid: currentUser.id,
    });
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  };

  // ==================== NOTIFICAÇÕES / AUDITORIA ====================
  type NotificationTarget =
    | { recipientUid: string; recipientRoles?: never }
    | { recipientRoles: UserRole[]; recipientUid?: never };

  const addNotification = (title: string, message: string, target: NotificationTarget) => {
    if (!currentUser) return;
    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const date = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const recipientUid = target.recipientUid ?? '';
    const recipientRoles = target.recipientRoles ?? [];
    const isForCurrentUser =
      (recipientUid && recipientUid === currentUser.id) ||
      recipientRoles.includes(currentUser.role);

    if (isForCurrentUser) {
      const newNotif: AppNotification = {
        id,
        title,
        message,
        date,
        read: false,
        recipientUid,
        recipientRoles,
        readBy: [],
        senderUid: currentUser.id,
        criadoEm: new Date().toISOString(),
      };
      setNotifications((prev) => (prev.some((n) => n.id === id) ? prev : [newNotif, ...prev]));
    }

    void criarNotificacaoFirestore({
      id,
      title,
      message,
      date,
      recipientUid,
      recipientRoles,
      senderUid: currentUser.id,
    }).catch((err) => {
      console.warn('Não foi possível salvar a notificação no Firestore:', err);
    });
  };

  const markNotificationAsRead = (id: string) => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              read: true,
              readBy: n.readBy.includes(currentUser.id) ? n.readBy : [...n.readBy, currentUser.id],
            }
          : n
      )
    );
    void marcarNotificacaoLidaFirestore(id, currentUser.id).catch((err) => {
      console.warn('Não foi possível marcar notificação como lida no Firestore:', err);
    });
  };

  const markAllNotificationsAsRead = () => {
    if (!currentUser) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
        readBy: n.readBy.includes(currentUser.id) ? n.readBy : [...n.readBy, currentUser.id],
      }))
    );
    unread.forEach((n) => {
      void marcarNotificacaoLidaFirestore(n.id, currentUser.id).catch((err) => {
        console.warn('Não foi possível marcar notificação como lida no Firestore:', err);
      });
    });
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
  const persistRequest = async (updated: AdvanceRequest): Promise<boolean> => {
    setRequests((prev) =>
      prev.some((r) => r.id === updated.id)
        ? prev.map((r) => (r.id === updated.id ? updated : r))
        : [updated, ...prev]
    );
    try {
      const withFiles = await uploadRequestFiles(updated);
      await upsertRequestFirestore(withFiles);
      return true;
    } catch (err) {
      reportError('A alteração NÃO foi salva no Firebase', err);
      return false;
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
    addNotification(
      'Nova Solicitação',
      `Solicitação ${newCode} de ${currentUser.name} enviada para análise.`,
      { recipientRoles: ['admin', 'financeiro'] }
    );
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
        ? `Sua solicitação ${req.code} foi aprovada sem necessidade de Nota Fiscal e liberada para anexar comprovantes.`
        : validAmount
        ? `Sua solicitação ${req.code} foi aprovada com valor de R$ ${validAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
        : `Sua solicitação ${req.code} foi aprovada.`,
      { recipientUid: req.operatorId }
    );
  };

  const rejectRequest = (id: string, reason: string) => {
    if (!currentUser) return;
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    void persistRequest(
      withHistory(req, 'Solicitação Rejeitada', { comment: reason, statusAfter: 'Rejeitado' })
    );
    addNotification('Solicitação Rejeitada', `Sua solicitação ${req.code} foi rejeitada.`, {
      recipientUid: req.operatorId,
    });
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
    addNotification('Ajustes Solicitados', `Sua solicitação ${req.code} precisa de ajustes.`, {
      recipientUid: req.operatorId,
    });
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
    addNotification(
      'NF Autorizada',
      `Emissão de Nota Fiscal autorizada para sua solicitação ${req.code}.`,
      { recipientUid: req.operatorId }
    );
  };

  const submitInvoice = async (
    id: string,
    invoiceData: Omit<InvoiceData, 'status'>
  ): Promise<boolean> => {
    if (!currentUser) return false;
    const req = requests.find((r) => r.id === id);
    if (!req) return false;
    const fullInvoice: InvoiceData = { ...invoiceData, status: 'pendente' };
    const ok = await persistRequest(
      withHistory(req, 'Nota Fiscal Enviada para Conferência', {
        comment: `NF nº ${invoiceData.number} enviada.`,
        statusAfter: 'Nota Fiscal em conferência',
        patch: { invoice: fullInvoice },
      })
    );
    if (!ok) return false;
    addNotification(
      'NF Enviada',
      `Nota Fiscal da solicitação ${req.code} (${req.operatorName}) enviada para conferência.`,
      { recipientRoles: ['admin', 'financeiro'] }
    );
    return true;
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
      `A Nota Fiscal da sua solicitação ${req.code} foi ${approved ? 'aprovada' : 'devolvida para correção'}.`,
      { recipientUid: req.operatorId }
    );
  };

  const registerPayment = async (id: string, paymentData: PaymentData): Promise<boolean> => {
    if (!currentUser) return false;
    const req = requests.find((r) => r.id === id);
    if (!req) return false;
    const ok = await persistRequest(
      withHistory(req, 'Pagamento Registrado', {
        comment: `Valor de R$ ${paymentData.amountPaid.toFixed(2)} pago via ${paymentData.method}.`,
        statusAfter: 'Pago',
        patch: { payment: paymentData },
      })
    );
    if (!ok) return false;
    addNotification('Pagamento Efetuado', `Pagamento da sua solicitação ${req.code} registrado.`, {
      recipientUid: req.operatorId,
    });
    return true;
  };

  const submitAccountability = async (id: string, expenses: ExpenseItem[]): Promise<boolean> => {
    if (!currentUser) return false;
    const req = requests.find((r) => r.id === id);
    if (!req) return false;
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

    const ok = await persistRequest(
      withHistory(req, 'Prestação de Contas Enviada', {
        comment: `Total de despesas: R$ ${totalExpenses.toFixed(2)}.`,
        statusAfter: 'Prestação em análise',
        patch: { accountability: accountabilityData },
      })
    );
    if (!ok) return false;
    addNotification(
      'Prestação Enviada',
      `Prestação de contas de ${req.code} (${req.operatorName}) enviada para análise.`,
      { recipientRoles: ['admin', 'financeiro'] }
    );
    return true;
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
    addNotification(
      'Atividade Finalizada',
      `A solicitação ${req.code} (${req.operatorName}) foi finalizada com sucesso.`,
      currentUser.id === req.operatorId
        ? { recipientRoles: ['admin', 'financeiro'] }
        : { recipientUid: req.operatorId }
    );
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
      `Sua prestação de contas de ${req.code} foi ${approved ? 'aprovada' : 'devolvida para ajustes'}.`,
      { recipientUid: req.operatorId }
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
      `Devolução de saldo para ${req.code} registrada e processo finalizado.`,
      currentUser.id === req.operatorId
        ? { recipientRoles: ['admin', 'financeiro'] }
        : { recipientUid: req.operatorId }
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
    addNotification(
      'Reembolso Aprovado',
      `Reembolso excedente para sua solicitação ${req.code} aprovado.`,
      { recipientUid: req.operatorId }
    );
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
    addNotification(
      'Processo Finalizado',
      `Sua solicitação ${req.code} foi totalmente finalizada.`,
      { recipientUid: req.operatorId }
    );
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
    if (currentUser) {
      addNotification(
        'Usuário Cadastrado',
        customPass
          ? `Novo usuário ${newUser.name} cadastrado com senha personalizada.`
          : `Novo usuário ${newUser.name} cadastrado com senha padrão '${DEFAULT_PASSWORD}'.`,
        { recipientUid: currentUser.id }
      );
    }
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
    if (currentUser) {
      addNotification('Usuário Atualizado', 'Dados e perfil de acesso atualizados com sucesso.', {
        recipientUid: currentUser.id,
      });
    }
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
    if (currentUser) {
      addNotification(
        'Novo Cadastro de Prestador',
        `${campos16.nome} (${campos16.empresa}) enviou o formulário público.`,
        { recipientRoles: ['admin', 'financeiro'] }
      );
    }
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
    addNotification('Cadastro Concluído', `Cadastro de ${alvo?.nome || ''} foi concluído.`, {
      recipientUid: currentUser.id,
    });
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
        const prepared = await prepareUploadFile(file, 1400, 0.78);
        const up = await uploadAuthenticatedFile('notas', notaId, prepared.file, onProgress);
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
      `Nota ${novaNota.numero} registrada para ${prestador.nome}.`,
      { recipientRoles: ['admin', 'financeiro'] }
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
        const prepared = await prepareUploadFile(file, 1400, 0.78);
        const up = await uploadAuthenticatedFile('notas', notaId, prepared.file, onProgress);
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
    addNotification(
      'Nota Atualizada',
      `Nota ${updates.numero} atualizada com sucesso.`,
      isAdmin ? { recipientUid: existing.criadoPorUid } : { recipientRoles: ['admin', 'financeiro'] }
    );
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
      `Nota ${existing.numero} (${existing.prestadorNome}) agora aguarda comprovante.`,
      { recipientRoles: ['vistoria_ameta'] }
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

    const prepared = await prepareUploadFile(file, 1280, 0.74);
    const uploadTargetFile = prepared.file;
    const validMime: ComprovanteServico['tipo'] =
      uploadTargetFile.type === 'image/jpeg' || uploadTargetFile.type === 'image/png'
        ? uploadTargetFile.type
        : 'application/pdf';

    let arquivoPath = '';
    let arquivoNome = file.name;
    let arquivoData: string | undefined;

    try {
      const up = await uploadAuthenticatedFile('comprovantes', folderId, uploadTargetFile, onProgress);
      arquivoPath = up.arquivoPath;
      arquivoNome = up.arquivoNome;
    } catch (storageErr) {
      if (prepared.dataUrl && prepared.dataUrl.length <= 780_000) {
        console.warn('Storage indisponível; salvando comprovante comprimido no Firestore:', storageErr);
        arquivoPath = `inline/${compId}`;
        arquivoData = prepared.dataUrl;
        onProgress?.(100);
      } else {
        throw new Error(`Falha ao enviar o arquivo para o Storage: ${errorText(storageErr)}`);
      }
    }

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
      arquivoData,
      tipo: validMime,
      tamanho: uploadTargetFile.size,
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

    addNotification(
      'Comprovante Enviado',
      `Comprovante ${arquivoNome} anexado a ${nota ? `nota ${nota.numero}` : `solicitação ${req?.code}`}.`,
      nota
        ? { recipientRoles: ['admin', 'financeiro', 'vistoria_nota'] }
        : { recipientRoles: ['admin', 'financeiro'] }
    );
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
        markAllNotificationsAsRead,
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
