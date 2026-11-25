import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  User,
  AdvanceRequest,
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
  UserRole,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_REQUESTS,
  INITIAL_CADASTROS,
  INITIAL_NOTAS_EQUIPE,
  INITIAL_COMPROVANTES,
  INITIAL_AUDITORIA,
} from '../data/mockData';
import { auth, googleProvider } from '../firebase';
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
  registrarAuditoriaFirestore,
  subscribeTeamCollections,
  uploadAuthenticatedFile,
  upsertUserFirestore,
} from '../services/firebaseService';
import { readFileAsDataUrl } from '../utils/fileHelpers';

interface AppContextType {
  users: User[];
  requests: AdvanceRequest[];
  cadastros: CadastroPrestador[];
  notasEquipe: NotaFiscalEquipe[];
  comprovantes: ComprovanteServico[];
  auditoria: AuditoriaEntry[];
  currentUser: User | null;
  firebaseAuthenticated: boolean;
  login: (email: string, pass: string) => boolean;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  changePassword: (newPass: string) => void;
  activeRole: 'operador' | 'financeiro';

  // Existing Advance Request Actions
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

  // User Management
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'active'>) => void;
  updateUser: (
    userId: string,
    updates: Partial<Pick<User, 'name' | 'email' | 'cpfCnpj' | 'phone' | 'role' | 'active'>>
  ) => void;
  toggleUserStatus: (userId: string) => void;

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
      notaId: string;
      prestadorId: string;
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

  // Notifications
  notifications: Array<{ id: string; title: string; message: string; date: string; read: boolean }>;
  markNotificationAsRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LEGACY_DEMO_USER_IDS = new Set([
  'op-1',
  'op-2',
  'op-3',
  'op-4',
  'op-5',
  'fin-1',
  'fin-2',
  'nota-1',
  'ameta-1',
]);

const LEGACY_DEMO_REQUEST_IDS = new Set([
  'req-001',
  'req-002',
  'req-003',
  'req-004',
  'req-005',
  'req-006',
  'req-007',
  'req-008',
  'req-009',
  'req-010',
]);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ameta_users');
    if (!saved) return INITIAL_USERS;
    const parsed: User[] = JSON.parse(saved);
    const cleaned = parsed.filter((u) => !LEGACY_DEMO_USER_IDS.has(u.id));
    return cleaned.length > 0 ? cleaned : INITIAL_USERS;
  });

  const [requests, setRequests] = useState<AdvanceRequest[]>(() => {
    const saved = localStorage.getItem('ameta_requests');
    if (!saved) return INITIAL_REQUESTS;
    const parsed: AdvanceRequest[] = JSON.parse(saved);
    return parsed.filter((r) => !LEGACY_DEMO_REQUEST_IDS.has(r.id));
  });

  const [cadastros, setCadastros] = useState<CadastroPrestador[]>(() => {
    const saved = localStorage.getItem('ameta_cadastros');
    return saved ? JSON.parse(saved) : INITIAL_CADASTROS;
  });

  const [notasEquipe, setNotasEquipe] = useState<NotaFiscalEquipe[]>(() => {
    const saved = localStorage.getItem('ameta_notas_equipe');
    return saved ? JSON.parse(saved) : INITIAL_NOTAS_EQUIPE;
  });

  const [comprovantes, setComprovantes] = useState<ComprovanteServico[]>(() => {
    const saved = localStorage.getItem('ameta_comprovantes');
    return saved ? JSON.parse(saved) : INITIAL_COMPROVANTES;
  });

  const [auditoria, setAuditoria] = useState<AuditoriaEntry[]>(() => {
    const saved = localStorage.getItem('ameta_auditoria');
    return saved ? JSON.parse(saved) : INITIAL_AUDITORIA;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const savedId = localStorage.getItem('ameta_current_user_id');
    if (!savedId || LEGACY_DEMO_USER_IDS.has(savedId)) return null;
    return savedId;
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseAuthenticated, setFirebaseAuthenticated] = useState(false);

  const demoUser = users.find((u) => u.id === currentUserId) || null;
  const currentUser = firebaseAuthenticated ? firebaseUser : demoUser;
  const activeRole: 'operador' | 'financeiro' =
    currentUser?.role === 'operador' ? 'operador' : 'financeiro';

  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; date: string; read: boolean }>
  >([]);

  // Listen to Firebase Auth state and subscribe to Firestore when signed in via Firebase
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (fbAuthUser) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (!fbAuthUser) {
        setFirebaseAuthenticated(false);
        setFirebaseUser(null);
        return;
      }

      try {
        let profile = await fetchUserProfileFirestore(fbAuthUser.uid);
        if (
          !profile &&
          fbAuthUser.email === 'blabluki@gmail.com' &&
          fbAuthUser.emailVerified
        ) {
          const adminBootstrap: User = {
            id: fbAuthUser.uid,
            name: fbAuthUser.displayName || 'Administrador AMETA',
            email: fbAuthUser.email,
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

        if (profile && profile.active) {
          setFirebaseUser(profile);
          setFirebaseAuthenticated(true);
          unsubFirestore = subscribeTeamCollections({
            isAdmin: profile.role === 'admin' || profile.role === 'financeiro',
            onCadastros: setCadastros,
            onNotas: setNotasEquipe,
            onComprovantes: setComprovantes,
            onAuditoria: setAuditoria,
            onUsers: (fbUsers) => {
              if (fbUsers.length > 0) setUsers(fbUsers);
            },
          });
        } else {
          setFirebaseAuthenticated(false);
          setFirebaseUser(null);
        }
      } catch (err) {
        console.error('Erro ao carregar perfil Firebase:', err);
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ameta_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ameta_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    if (!firebaseAuthenticated) {
      localStorage.setItem('ameta_cadastros', JSON.stringify(cadastros));
    }
  }, [cadastros, firebaseAuthenticated]);

  useEffect(() => {
    if (!firebaseAuthenticated) {
      localStorage.setItem('ameta_notas_equipe', JSON.stringify(notasEquipe));
    }
  }, [notasEquipe, firebaseAuthenticated]);

  useEffect(() => {
    if (!firebaseAuthenticated) {
      localStorage.setItem('ameta_comprovantes', JSON.stringify(comprovantes));
    }
  }, [comprovantes, firebaseAuthenticated]);

  useEffect(() => {
    if (!firebaseAuthenticated) {
      localStorage.setItem('ameta_auditoria', JSON.stringify(auditoria));
    }
  }, [auditoria, firebaseAuthenticated]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('ameta_current_user_id', currentUserId);
    } else {
      localStorage.removeItem('ameta_current_user_id');
    }
  }, [currentUserId]);

  const login = (email: string, pass: string): boolean => {
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.active
    );
    if (!found) return false;
    const userPass = found.password || 'ameta123';
    if (userPass === pass) {
      setCurrentUserId(found.id);
      return true;
    }
    return false;
  };

  const loginWithGoogle = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await fetchUserProfileFirestore(cred.user.uid);
      const isBootstrapAdmin =
        cred.user.email === 'blabluki@gmail.com' && cred.user.emailVerified;
      if (!profile && !isBootstrapAdmin) {
        await signOut(auth);
        return {
          ok: false,
          error:
            'Conta Google autenticada, mas ainda sem acesso liberado pelo Administrador em Usuários.',
        };
      }
      if (profile && !profile.active) {
        await signOut(auth);
        return { ok: false, error: 'Este usuário está desativado no sistema.' };
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao autenticar com Google.',
      };
    }
  };

  const logout = () => {
    setCurrentUserId(null);
    if (auth.currentUser) {
      signOut(auth).catch(() => {});
    }
  };

  const changePassword = (newPass: string) => {
    if (!currentUser) return;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return { ...u, password: newPass, isFirstLogin: false };
        }
        return u;
      })
    );
    if (firebaseAuthenticated && firebaseUser) {
      upsertUserFirestore({ ...firebaseUser, isFirstLogin: false }).catch(console.error);
      setFirebaseUser({ ...firebaseUser, isFirstLogin: false });
    }
    addNotification('Senha Alterada', 'Sua senha foi alterada com sucesso.');
  };

  const addNotification = (title: string, message: string) => {
    const newNotif = {
      id: 'notif-' + Date.now(),
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
    const entry: AuditoriaEntry = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      acao,
      entidade,
      entidadeId,
      detalhes,
      autorUid: currentUser.id,
      autorNome: currentUser.name,
      autorRole: currentUser.role,
      criadoEm: new Date().toISOString(),
    };
    setAuditoria((prev) => [entry, ...prev]);
    if (firebaseAuthenticated) {
      await registrarAuditoriaFirestore({
        acao,
        entidade,
        entidadeId,
        detalhes,
        autorUid: currentUser.id,
        autorNome: currentUser.name,
        autorRole: currentUser.role,
      });
    }
  };

  // ==================== EXISTING ADVANCE REQUEST ACTIONS ====================
  const logAction = (
    requestId: string,
    title: string,
    comment?: string,
    statusBefore?: RequestStatus,
    statusAfter?: RequestStatus
  ) => {
    if (!currentUser) return;
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        const newEntry = {
          id: 'h-' + Date.now() + Math.random().toString(36).substr(2, 4),
          date: new Date().toISOString(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          title,
          comment,
          statusBefore,
          statusAfter,
        };
        return {
          ...req,
          status: statusAfter || req.status,
          history: [newEntry, ...req.history],
        };
      })
    );
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
    const newCode = `ADV-2026-${String(requests.length + 1).padStart(3, '0')}`;
    const newReq: AdvanceRequest = {
      id: 'req-' + Date.now(),
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
      createdAt: new Date().toISOString(),
      history: [
        {
          id: 'h-' + Date.now(),
          date: new Date().toISOString(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          title: 'Solicitação Criada e Enviada',
          comment: data.activities ? `Atividades: ${data.activities}` : undefined,
          statusAfter: 'Solicitação enviada',
        },
      ],
    };
    setRequests((prev) => [newReq, ...prev]);
    addNotification('Nova Solicitação', `Solicitação ${newCode} enviada para análise.`);
  };

  const approveRequest = (id: string, comment?: string, approvedAmount?: number) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const validAmount =
      approvedAmount !== undefined && !Number.isNaN(approvedAmount) && approvedAmount > 0
        ? approvedAmount
        : undefined;
    if (validAmount !== undefined) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, amountRequested: validAmount } : r))
      );
    }
    const amountNote = validAmount
      ? `Valor definido pelo Coordenador: R$ ${validAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : '';
    const fullComment = [amountNote, comment].filter(Boolean).join(' — ') || undefined;
    logAction(id, 'Solicitação Aprovada pelo Coordenador / Financeiro', fullComment, req.status, 'Em análise financeira');
    addNotification(
      'Solicitação Aprovada',
      validAmount
        ? `A solicitação ${req.code} foi aprovada com valor de R$ ${validAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
        : `A solicitação ${req.code} foi aprovada.`
    );
  };

  const rejectRequest = (id: string, reason: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    logAction(id, 'Solicitação Rejeitada', reason, req.status, 'Rejeitado');
    addNotification('Solicitação Rejeitada', `A solicitação ${req.code} foi rejeitada.`);
  };

  const returnRequestForAdjustment = (id: string, reason: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    logAction(id, 'Solicitação Devolvida para Ajustes', reason, req.status, 'Aguardando ajustes');
    addNotification('Ajustes Solicitados', `A solicitação ${req.code} precisa de ajustes.`);
  };

  const authorizeInvoice = (id: string, observation: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, invoiceAuthorized: true, invoiceObservation: observation } : r
      )
    );
    logAction(
      id,
      'Emissão de Nota Fiscal Autorizada',
      observation,
      req.status,
      'Autorizado emitir Nota Fiscal'
    );
    addNotification('NF Autorizada', `Emissão de Nota Fiscal autorizada para ${req.code}.`);
  };

  const submitInvoice = (id: string, invoiceData: Omit<InvoiceData, 'status'>) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const fullInvoice: InvoiceData = { ...invoiceData, status: 'pendente' };
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, invoice: fullInvoice } : r)));
    logAction(
      id,
      'Nota Fiscal Enviada para Conferência',
      `NF nº ${invoiceData.number} enviada.`,
      req.status,
      'Nota Fiscal em conferência'
    );
    addNotification(
      'NF Enviada',
      `Nota Fiscal da solicitação ${req.code} enviada para conferência.`
    );
  };

  const reviewInvoice = (id: string, approved: boolean, comment?: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const newStatus: RequestStatus = approved
      ? 'Aguardando pagamento'
      : 'Nota Fiscal devolvida para correção';
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          invoice: r.invoice
            ? {
                ...r.invoice,
                status: approved ? 'aprovado' : 'devolvido',
                reviewComment: comment,
              }
            : undefined,
        };
      })
    );
    logAction(
      id,
      approved ? 'Nota Fiscal Aprovada' : 'Nota Fiscal Devolvida para Correção',
      comment,
      req.status,
      newStatus
    );
    addNotification(
      approved ? 'NF Aprovada' : 'NF Devolvida',
      `Nota Fiscal de ${req.code} foi ${approved ? 'aprovada' : 'devolvida'}.`
    );
  };

  const registerPayment = (id: string, paymentData: PaymentData) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, payment: paymentData } : r)));
    logAction(
      id,
      'Pagamento Registrado',
      `Valor de R$ ${paymentData.amountPaid.toFixed(2)} pago via ${paymentData.method}.`,
      req.status,
      'Pago'
    );
    addNotification('Pagamento Efetuado', `Pagamento da solicitação ${req.code} registrado.`);
  };

  const submitAccountability = (id: string, expenses: ExpenseItem[]) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const totalExpenses = expenses.reduce((acc, item) => acc + item.amount, 0);
    const advanceAmount = req.amountRequested;
    const diff = advanceAmount - totalExpenses;
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

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, accountability: accountabilityData } : r))
    );
    logAction(
      id,
      'Prestação de Contas Enviada',
      `Total de despesas: R$ ${totalExpenses.toFixed(2)}.`,
      req.status,
      'Prestação em análise'
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
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId || !req.accountability) return req;
        const updatedExpenses = req.accountability.expenses.map((e) => {
          if (e.id === expenseId) {
            return { ...e, approved, reviewComment };
          }
          return e;
        });
        const totalExpenses = updatedExpenses
          .filter((e) => e.approved !== false)
          .reduce((acc, item) => acc + item.amount, 0);
        const diff = req.amountRequested - totalExpenses;
        let balanceType: 'saldo_a_devolver' | 'excedente' | 'zerado' = 'zerado';
        const balanceAmount = Math.abs(diff);
        if (diff > 0) balanceType = 'saldo_a_devolver';
        else if (diff < 0) balanceType = 'excedente';

        return {
          ...req,
          accountability: {
            ...req.accountability,
            expenses: updatedExpenses,
            totalExpenses,
            balanceType,
            balanceAmount,
          },
        };
      })
    );
  };

  const reviewAccountability = (id: string, approved: boolean, comment?: string) => {
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

    logAction(
      id,
      approved ? 'Prestação de Contas Aprovada' : 'Prestação Devolvida para Ajustes',
      comment,
      req.status,
      nextStatus
    );
    addNotification(
      'Prestação Analisada',
      `Prestação de ${req.code} foi ${approved ? 'aprovada' : 'devolvida'}.`
    );
  };

  const registerRefund = (id: string, refundData: RefundData) => {
    const req = requests.find((r) => r.id === id);
    if (!req || !req.accountability) return;
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id || !r.accountability) return r;
        return {
          ...r,
          accountability: {
            ...r.accountability,
            refundDetails: refundData,
          },
        };
      })
    );
    logAction(
      id,
      'Devolução de Saldo Registrada',
      `Valor devolvido: R$ ${refundData.amount.toFixed(2)} via ${refundData.method}.`,
      req.status,
      'Finalizado'
    );
    addNotification(
      'Devolução Registrada',
      `Devolução de saldo para ${req.code} registrada e processo finalizado.`
    );
  };

  const approveReimbursement = (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req || !req.accountability) return;
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id || !r.accountability) return r;
        return {
          ...r,
          accountability: {
            ...r.accountability,
            reimbursementStatus: 'aprovado',
          },
        };
      })
    );
    logAction(
      id,
      'Reembolso de Excedente Aprovado e Finalizado',
      'Reembolso autorizado para pagamento.',
      req.status,
      'Finalizado'
    );
    addNotification('Reembolso Aprovado', `Reembolso excedente para ${req.code} aprovado.`);
  };

  const finalizeAccountability = (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    logAction(
      id,
      'Prestação Finalizada',
      'Todas as pendências financeiras foram resolvidas.',
      req.status,
      'Finalizado'
    );
    addNotification('Processo Finalizado', `Solicitação ${req.code} totalmente finalizada.`);
  };

  // ==================== USER MANAGEMENT ====================
  const addUser = (userData: Omit<User, 'id' | 'createdAt' | 'active'>) => {
    const newUser: User = {
      ...userData,
      id: 'user-' + Date.now(),
      createdAt: new Date().toISOString().substring(0, 10),
      active: true,
      ativo: true,
      password: 'ameta123',
      isFirstLogin: true,
    };
    setUsers((prev) => [...prev, newUser]);
    if (firebaseAuthenticated) {
      upsertUserFirestore(newUser).catch(console.error);
    }
    addNotification(
      'Usuário Cadastrado',
      `Novo usuário ${newUser.name} cadastrado com senha padrão 'ameta123'.`
    );
  };

  const updateUser = (
    userId: string,
    updates: Partial<Pick<User, 'name' | 'email' | 'cpfCnpj' | 'phone' | 'role' | 'active'>>
  ) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated: User = {
          ...u,
          ...updates,
          ativo: updates.active !== undefined ? updates.active : u.active,
        };
        if (firebaseAuthenticated) {
          upsertUserFirestore(updated).catch(console.error);
        }
        return updated;
      })
    );
    addNotification('Usuário Atualizado', 'Dados e perfil de acesso atualizados com sucesso.');
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated = { ...u, active: !u.active, ativo: !u.active };
        if (firebaseAuthenticated) {
          upsertUserFirestore(updated).catch(console.error);
        }
        return updated;
      })
    );
  };

  // ==================== PUBLIC CADASTRO & TEAMS WORKFLOW ====================
  const createCadastro = async (
    campos16: Omit<
      CadastroPrestador,
      'id' | 'status' | 'criadoEm' | 'concluidoEm' | 'concluidoPorUid' | 'concluidoPorNome'
    >
  ): Promise<CadastroPrestador> => {
    const id = 'cad-' + Date.now();
    const novoCadastro: CadastroPrestador = {
      ...campos16,
      id,
      status: 'Pendente',
      criadoEm: new Date().toISOString(),
    };
    setCadastros((prev) => [novoCadastro, ...prev]);

    try {
      await criarCadastroPublicoFirestore(id, campos16);
    } catch (err) {
      console.warn('Persistência local utilizada para cadastro público:', err);
    }

    addNotification(
      'Novo Cadastro de Prestador',
      `${campos16.nome} (${campos16.empresa}) enviou o formulário público.`
    );
    return novoCadastro;
  };

  const concluirCadastro = async (cadastroId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'financeiro')) return;
    const alvo = cadastros.find((c) => c.id === cadastroId);
    const now = new Date().toISOString();
    setCadastros((prev) =>
      prev.map((c) =>
        c.id === cadastroId
          ? {
              ...c,
              status: 'Concluído',
              concluidoEm: now,
              concluidoPorUid: currentUser.id,
              concluidoPorNome: currentUser.name,
            }
          : c
      )
    );
    if (firebaseAuthenticated) {
      await atualizarStatusCadastroFirestore(cadastroId, {
        status: 'Concluído',
        concluidoPorUid: currentUser.id,
        concluidoPorNome: currentUser.name,
      });
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
    let arquivoData: string | undefined;

    if (file) {
      if (firebaseAuthenticated) {
        const up = await uploadAuthenticatedFile('notas', notaId, file, onProgress);
        arquivoPath = up.arquivoPath;
        arquivoNome = up.arquivoNome;
      } else {
        onProgress?.(45);
        arquivoData = await readFileAsDataUrl(file);
        arquivoNome = file.name;
        arquivoPath = `notas/${notaId}/${file.name}`;
        onProgress?.(100);
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
      arquivoData,
      status: 'Emitida',
      criadoPorUid: currentUser.id,
      criadoPorNome: currentUser.name,
      criadoEm: now,
      atualizadoEm: now,
    };

    setNotasEquipe((prev) => [novaNota, ...prev]);

    if (firebaseAuthenticated) {
      const { arquivoData: _, ...firestorePayload } = novaNota;
      await criarNotaFirestore(firestorePayload);
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
    let arquivoData = existing.arquivoData;

    if (file) {
      if (firebaseAuthenticated) {
        const up = await uploadAuthenticatedFile('notas', notaId, file, onProgress);
        arquivoPath = up.arquivoPath;
        arquivoNome = up.arquivoNome;
      } else {
        onProgress?.(50);
        arquivoData = await readFileAsDataUrl(file);
        arquivoNome = file.name;
        arquivoPath = `notas/${notaId}/${file.name}`;
        onProgress?.(100);
      }
    }

    const now = new Date().toISOString();
    setNotasEquipe((prev) =>
      prev.map((n) =>
        n.id === notaId
          ? {
              ...n,
              ...updates,
              arquivoPath,
              arquivoNome,
              arquivoData,
              atualizadoEm: now,
            }
          : n
      )
    );

    if (firebaseAuthenticated) {
      await atualizarNotaFirestore(notaId, {
        ...updates,
        arquivoPath,
        arquivoNome,
      });
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
    const now = new Date().toISOString();

    setNotasEquipe((prev) =>
      prev.map((n) =>
        n.id === notaId ? { ...n, status: 'Aguardando comprovante', atualizadoEm: now } : n
      )
    );

    setCadastros((prev) =>
      prev.map((c) =>
        c.id === existing.prestadorId && c.status === 'Pendente'
          ? { ...c, status: 'Em andamento' }
          : c
      )
    );

    if (firebaseAuthenticated) {
      await atualizarNotaFirestore(notaId, { status: 'Aguardando comprovante' });
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
    setNotasEquipe((prev) => prev.filter((n) => n.id !== notaId));
    if (firebaseAuthenticated) {
      await excluirNotaFirestore(notaId, target?.arquivoPath);
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
      notaId: string;
      prestadorId: string;
      categoria?: ExpenseCategory;
      valor?: number;
      descricao: string;
      data: string;
    },
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<ComprovanteServico> => {
    if (!currentUser) throw new Error('Usuário não autenticado.');
    const nota = notasEquipe.find((n) => n.id === data.notaId);
    if (!nota) throw new Error('É obrigatório existir uma nota fiscal vinculada.');

    const compId = 'comp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
    let arquivoPath = '';
    let arquivoNome = file.name;
    let arquivoData: string | undefined;

    if (firebaseAuthenticated) {
      const up = await uploadAuthenticatedFile('comprovantes', nota.id, file, onProgress);
      arquivoPath = up.arquivoPath;
      arquivoNome = up.arquivoNome;
    } else {
      onProgress?.(40);
      arquivoData = await readFileAsDataUrl(file);
      onProgress?.(100);
      arquivoPath = `comprovantes/${nota.id}/${file.name}`;
    }

    const validMime: ComprovanteServico['tipo'] =
      file.type === 'image/jpeg' || file.type === 'image/png' ? file.type : 'application/pdf';

    const novoComp: ComprovanteServico = {
      id: compId,
      notaId: nota.id,
      prestadorId: data.prestadorId,
      categoria: data.categoria,
      valor: data.valor !== undefined ? Number(data.valor) : undefined,
      descricao: data.descricao.trim(),
      data: data.data,
      arquivoPath,
      arquivoNome,
      arquivoData,
      tipo: validMime,
      tamanho: file.size,
      criadoPorUid: currentUser.id,
      criadoPorNome: currentUser.name,
      criadoEm: new Date().toISOString(),
    };

    setComprovantes((prev) => [novoComp, ...prev]);

    const wasNotComprovada = nota.status !== 'Comprovada';
    if (wasNotComprovada) {
      setNotasEquipe((prev) =>
        prev.map((n) =>
          n.id === nota.id
            ? { ...n, status: 'Comprovada', atualizadoEm: new Date().toISOString() }
            : n
        )
      );
    }

    if (firebaseAuthenticated) {
      const { arquivoData: _, ...firestorePayload } = novoComp;
      await criarComprovanteFirestore(firestorePayload);
      if (wasNotComprovada) {
        await atualizarNotaFirestore(nota.id, { status: 'Comprovada' });
      }
    }

    await appendAuditoria(
      'Comprovante enviado',
      'comprovante',
      compId,
      `Comprovante ${arquivoNome} anexado à nota ${nota.numero}`
    );

    addNotification(
      'Comprovante Enviado',
      `Comprovante anexado à nota ${nota.numero} com sucesso.`
    );
    return novoComp;
  };

  const deleteComprovante = async (comprovanteId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'financeiro')) return;
    const target = comprovantes.find((c) => c.id === comprovanteId);
    setComprovantes((prev) => prev.filter((c) => c.id !== comprovanteId));
    if (firebaseAuthenticated) {
      await excluirComprovanteFirestore(comprovanteId, target?.arquivoPath);
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
    if (!arquivoPath || !firebaseAuthenticated) return null;
    try {
      return await getAuthenticatedDownloadUrl(arquivoPath);
    } catch {
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
        firebaseAuthenticated,
        login,
        loginWithGoogle,
        logout,
        changePassword,
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
