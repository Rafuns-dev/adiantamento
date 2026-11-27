import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
    onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
  arrayUnion,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  uploadString,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import {
  CadastroPrestador,
  NotaFiscalEquipe,
  ComprovanteServico,
  AuditoriaEntry,
  User,
  AdvanceRequest,
  AppNotification,
  UserRole,
} from '../types';

/**
 * Remove recursivamente propriedades `undefined` (o Firestore não aceita esse valor).
 * Objetos que não são "planos" (ex.: FieldValue de serverTimestamp, Date) são preservados.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((v) => v !== undefined).map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function randomStorageName(originalName: string): string {
  const extMatch = originalName.toLowerCase().match(/\.[a-z0-9]+$/);
  const ext = extMatch ? extMatch[0] : '';
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${uuid}${ext}`;
}

export async function uploadAuthenticatedFile(
  folder: 'notas' | 'comprovantes',
  notaId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ arquivoPath: string; arquivoNome: string }> {
  const safeName = randomStorageName(file.name);
  const arquivoPath = `${folder}/${notaId}/${safeName}`;
  const storageRef = ref(storage, arquivoPath);

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    const timeout = setTimeout(() => {
      try {
        task.cancel();
      } catch {
        // ignore cancel error
      }
      reject(new Error('Tempo limite excedido ao enviar arquivo para o Storage.'));
    }, 15000);

    task.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
      () => {
        clearTimeout(timeout);
        resolve();
      }
    );
  });

  return { arquivoPath, arquivoNome: file.name };
}

/** Prefixo usado nos campos de arquivo das solicitações para indicar que o arquivo está no Storage. */
export const STORAGE_REF_PREFIX = 'storage:';

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/xml': '.xml',
  'text/xml': '.xml',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/** Sem Firebase Storage ativo: mantém os anexos comprimidos diretamente no documento do Firestore. */
export async function uploadRequestFiles(req: AdvanceRequest): Promise<AdvanceRequest> {
  return req;
}

export async function getAuthenticatedDownloadUrl(arquivoPath: string): Promise<string> {
  if (!arquivoPath || arquivoPath.startsWith('inline/')) {
    return '';
  }
  try {
    const storageRef = ref(storage, arquivoPath);
    return await getDownloadURL(storageRef);
  } catch {
    return '';
  }
}

export async function deleteStorageFile(arquivoPath?: string): Promise<void> {
  if (!arquivoPath || arquivoPath.startsWith('inline/')) return;
  try {
    await deleteObject(ref(storage, arquivoPath));
  } catch (err) {
    console.warn('Erro ao remover arquivo do Storage:', err);
  }
}

export async function criarCadastroPublicoFirestore(
  id: string,
  campos16: Omit<CadastroPrestador, 'id' | 'status' | 'criadoEm' | 'concluidoEm' | 'concluidoPorUid' | 'concluidoPorNome'>
): Promise<void> {
  const path = `cadastros/${id}`;
  try {
    await setDoc(doc(db, 'cadastros', id), {
      nome: campos16.nome.trim().slice(0, 150),
      cpf: campos16.cpf.trim().slice(0, 20),
      rg: campos16.rg.trim().slice(0, 30),
      dataNascimento: campos16.dataNascimento.trim().slice(0, 20),
      filiacaoMae: campos16.filiacaoMae.trim().slice(0, 150),
      filiacaoPai: campos16.filiacaoPai.trim().slice(0, 150),
      funcao: campos16.funcao.trim().slice(0, 120),
      empresa: campos16.empresa.trim().slice(0, 180),
      cnpj: campos16.cnpj.trim().slice(0, 25),
      telefone: campos16.telefone.trim().slice(0, 30),
      email: campos16.email.trim().slice(0, 180),
      cep: campos16.cep.trim().slice(0, 15),
      endereco: campos16.endereco.trim().slice(0, 250),
      cidadeUf: campos16.cidadeUf.trim().slice(0, 100),
      dadosBancarios: campos16.dadosBancarios.trim().slice(0, 200),
      chavePix: campos16.chavePix.trim().slice(0, 150),
      status: 'Pendente',
      criadoEm: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function atualizarStatusCadastroFirestore(
  id: string,
  updates: Partial<Pick<CadastroPrestador, 'status' | 'concluidoPorUid' | 'concluidoPorNome'>>
): Promise<void> {
  const path = `cadastros/${id}`;
  try {
    const payload: Record<string, unknown> = { ...updates };
    if (updates.status === 'Concluído') {
      payload.concluidoEm = serverTimestamp();
    }
    await updateDoc(doc(db, 'cadastros', id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function criarNotaFirestore(
  nota: Omit<NotaFiscalEquipe, 'criadoEm' | 'atualizadoEm'>
): Promise<void> {
  const path = `notas/${nota.id}`;
  try {
    const payload: Record<string, unknown> = {
      prestadorId: nota.prestadorId,
      prestadorNome: nota.prestadorNome.slice(0, 150),
      prestadorCnpj: nota.prestadorCnpj.slice(0, 25),
      numero: nota.numero.slice(0, 60),
      dataEmissao: nota.dataEmissao.slice(0, 20),
      valor: Number(nota.valor),
      descricao: nota.descricao.slice(0, 1000),
      status: 'Emitida',
      criadoPorUid: nota.criadoPorUid,
      criadoPorNome: nota.criadoPorNome.slice(0, 150),
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    };
    if (nota.prestadorEmpresa) payload.prestadorEmpresa = nota.prestadorEmpresa.slice(0, 180);
    if (nota.prestadorFuncao) payload.prestadorFuncao = nota.prestadorFuncao.slice(0, 120);
    if (nota.observacoes) payload.observacoes = nota.observacoes.slice(0, 1000);
    if (nota.arquivoPath) payload.arquivoPath = nota.arquivoPath.slice(0, 500);
    if (nota.arquivoNome) payload.arquivoNome = nota.arquivoNome.slice(0, 250);
    if (nota.arquivoData) payload.arquivoData = nota.arquivoData;

    await setDoc(doc(db, 'notas', nota.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function atualizarNotaFirestore(
  id: string,
  updates: Partial<Omit<NotaFiscalEquipe, 'id' | 'criadoEm' | 'criadoPorUid'>>
): Promise<void> {
  const path = `notas/${id}`;
  try {
    const payload: Record<string, unknown> = stripUndefined({
      ...updates,
      atualizadoEm: serverTimestamp(),
    });
    await updateDoc(doc(db, 'notas', id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function excluirNotaFirestore(id: string, arquivoPath?: string): Promise<void> {
  const path = `notas/${id}`;
  try {
    await deleteDoc(doc(db, 'notas', id));
    await deleteStorageFile(arquivoPath);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function criarComprovanteFirestore(
  comp: Omit<ComprovanteServico, 'criadoEm'>
): Promise<void> {
  const path = `comprovantes/${comp.id}`;
  try {
    const payload: Record<string, unknown> = {
      descricao: comp.descricao.slice(0, 500),
      data: comp.data.slice(0, 20),
      arquivoPath: comp.arquivoPath.slice(0, 500),
      tipo: comp.tipo,
      tamanho: Number(comp.tamanho),
      criadoPorUid: comp.criadoPorUid,
      criadoPorNome: comp.criadoPorNome.slice(0, 150),
      criadoEm: serverTimestamp(),
    };
    // As regras exigem notaId OU requestId. O vínculo com a solicitação (requestId) também precisa
    // ser gravado, senão comprovantes de solicitações são recusados pelo Firestore.
    if (comp.notaId) payload.notaId = comp.notaId;
    if (comp.requestId) payload.requestId = comp.requestId;
    if (comp.prestadorId) payload.prestadorId = comp.prestadorId;
    if (comp.prestadorName) payload.prestadorName = comp.prestadorName.slice(0, 150);
    if (comp.categoria) payload.categoria = comp.categoria;
    if (comp.valor !== undefined && !Number.isNaN(comp.valor)) payload.valor = Number(comp.valor);
    if (comp.arquivoNome) payload.arquivoNome = comp.arquivoNome.slice(0, 250);
    if (comp.arquivoData) payload.arquivoData = comp.arquivoData;

    await setDoc(doc(db, 'comprovantes', comp.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function excluirComprovanteFirestore(id: string, arquivoPath?: string): Promise<void> {
  const path = `comprovantes/${id}`;
  try {
    await deleteDoc(doc(db, 'comprovantes', id));
    await deleteStorageFile(arquivoPath);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function registrarAuditoriaFirestore(
  entry: Omit<AuditoriaEntry, 'id' | 'criadoEm'>
): Promise<void> {
  const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `auditoria/${id}`;
  try {
    const payload: Record<string, unknown> = {
      acao: entry.acao.slice(0, 120),
      entidade: entry.entidade,
      entidadeId: entry.entidadeId.slice(0, 128),
      autorUid: entry.autorUid,
      autorNome: entry.autorNome.slice(0, 150),
      autorRole: String(entry.autorRole).slice(0, 50),
      criadoEm: serverTimestamp(),
    };
    if (entry.detalhes) payload.detalhes = entry.detalhes.slice(0, 1000);
    await setDoc(doc(db, 'auditoria', id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fetchUserProfileFirestore(uid: string): Promise<User | null> {
  const path = `usuarios/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      id: snap.id,
      name: d.name,
      email: d.email,
      cpfCnpj: d.cpfCnpj || '',
      phone: d.phone || '',
      role: d.role,
      active: d.ativo !== false,
      ativo: d.ativo !== false,
      createdAt: d.createdAt || new Date().toISOString().slice(0, 10),
      isFirstLogin: !!d.isFirstLogin,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/** Marca o primeiro acesso como concluído (único campo que o próprio usuário pode alterar). */
export async function markFirstLoginDoneFirestore(uid: string): Promise<void> {
  const path = `usuarios/${uid}`;
  try {
    await updateDoc(doc(db, 'usuarios', uid), { isFirstLogin: false });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function upsertUserFirestore(user: User): Promise<void> {
  const path = `usuarios/${user.id}`;
  try {
    await setDoc(doc(db, 'usuarios', user.id), {
      uid: user.id,
      name: user.name.slice(0, 150),
      email: user.email.slice(0, 180),
      cpfCnpj: (user.cpfCnpj || '').slice(0, 30),
      phone: (user.phone || '').slice(0, 30),
      role: user.role,
      ativo: user.active,
      isFirstLogin: !!user.isFirstLogin,
      createdAt: user.createdAt || new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function upsertRequestFirestore(req: AdvanceRequest): Promise<void> {
  const path = `solicitacoes/${req.id}`;
  try {
    // `stripUndefined` garante que campos opcionais vazios não façam o Firestore recusar o documento.
    const payload = stripUndefined({ ...req });
    const serializedBytes = new Blob([JSON.stringify(payload)]).size;
    if (serializedBytes > 980_000) {
      throw new Error(
        'Os anexos ultrapassam o limite de 1 MB por documento no Firestore. Reduza a quantidade de fotos ou envie arquivos menores.'
      );
    }
    await setDoc(doc(db, 'solicitacoes', req.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function criarNotificacaoFirestore(params: {
  id: string;
  title: string;
  message: string;
  date: string;
  recipientUid?: string;
  recipientRoles?: UserRole[];
  senderUid: string;
}): Promise<void> {
  const path = `notificacoes/${params.id}`;
  try {
    await setDoc(doc(db, 'notificacoes', params.id), {
      title: params.title.slice(0, 120),
      message: params.message.slice(0, 500),
      date: params.date.slice(0, 40),
      recipientUid: (params.recipientUid || '').slice(0, 128),
      recipientRoles: (params.recipientRoles || []).slice(0, 5),
      readBy: [],
      senderUid: params.senderUid.slice(0, 128),
      criadoEm: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function marcarNotificacaoLidaFirestore(id: string, uid: string): Promise<void> {
  const path = `notificacoes/${id}`;
  try {
    await updateDoc(doc(db, 'notificacoes', id), {
      readBy: arrayUnion(uid),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export interface SubscribeCallbacks {
  uid: string;
  role: User['role'];
  onCadastros: (items: CadastroPrestador[]) => void;
  onNotas: (items: NotaFiscalEquipe[]) => void;
  onComprovantes: (items: ComprovanteServico[]) => void;
  onAuditoria: (items: AuditoriaEntry[]) => void;
  onRequests: (items: AdvanceRequest[]) => void;
  onUsers: (items: User[]) => void;
  onNotifications: (items: AppNotification[]) => void;
  /** Chamado quando uma leitura em tempo real falha (ex.: regra de segurança negou o acesso). */
  onError: (collectionName: string, error: unknown) => void;
}

/**
 * Abre as escutas em tempo real do Firestore conforme o perfil do usuário logado.
 * Cada perfil só assina as coleções que as regras (firestore.rules) permitem ler;
 * assinar uma coleção proibida geraria erro de permissão.
 */
export function subscribeTeamCollections(callbacks: SubscribeCallbacks): () => void {
  const unsubs: Array<() => void> = [];
  const isAdmin = callbacks.role === 'admin' || callbacks.role === 'financeiro';
  const canReadTeamCollections =
    isAdmin || callbacks.role === 'vistoria_nota' || callbacks.role === 'vistoria_ameta';

  const fail = (name: string) => (err: unknown) => {
    console.error(`Falha ao ler "${name}" do Firestore:`, err);
    callbacks.onError(name, err);
  };

  // Solicitações de adiantamento (todos os perfis internos)
  unsubs.push(
    onSnapshot(
      query(collection(db, 'solicitacoes'), orderBy('createdAt', 'desc')),
      (snap) => {
        callbacks.onRequests(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              ...(data as Omit<AdvanceRequest, 'id' | 'createdAt'>),
              id: d.id,
              createdAt: toIsoString(data.createdAt),
            };
          })
        );
      },
      fail('solicitacoes')
    )
  );

  // Auditoria (todos os perfis internos)
  unsubs.push(
    onSnapshot(
      query(collection(db, 'auditoria'), orderBy('criadoEm', 'desc')),
      (snap) => {
        callbacks.onAuditoria(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              ...(data as Omit<AuditoriaEntry, 'id' | 'criadoEm'>),
              id: d.id,
              criadoEm: toIsoString(data.criadoEm),
            };
          })
        );
      },
      fail('auditoria')
    )
  );

  if (canReadTeamCollections) {
    unsubs.push(
      onSnapshot(
        query(collection(db, 'cadastros'), orderBy('criadoEm', 'desc')),
        (snap) => {
          callbacks.onCadastros(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                ...(data as Omit<CadastroPrestador, 'id' | 'criadoEm' | 'concluidoEm'>),
                id: d.id,
                criadoEm: toIsoString(data.criadoEm),
                concluidoEm: data.concluidoEm ? toIsoString(data.concluidoEm) : undefined,
              };
            })
          );
        },
        fail('cadastros')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notas'), orderBy('criadoEm', 'desc')),
        (snap) => {
          callbacks.onNotas(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                ...(data as Omit<NotaFiscalEquipe, 'id' | 'criadoEm' | 'atualizadoEm'>),
                id: d.id,
                criadoEm: toIsoString(data.criadoEm),
                atualizadoEm: toIsoString(data.atualizadoEm),
              };
            })
          );
        },
        fail('notas')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'comprovantes'), orderBy('criadoEm', 'desc')),
        (snap) => {
          callbacks.onComprovantes(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                ...(data as Omit<ComprovanteServico, 'id' | 'criadoEm'>),
                id: d.id,
                criadoEm: toIsoString(data.criadoEm),
              };
            })
          );
        },
        fail('comprovantes')
      )
    );
  }

  // Usuários: somente Administrador / Financeiro podem listar
  if (isAdmin) {
    unsubs.push(
      onSnapshot(
        collection(db, 'usuarios'),
        (snap) => {
          callbacks.onUsers(
            snap.docs
              .map((d) => {
                const data = d.data();
                return {
                  id: d.id,
                  name: data.name,
                  email: data.email,
                  cpfCnpj: data.cpfCnpj || '',
                  phone: data.phone || '',
                  role: data.role,
                  active: data.ativo !== false,
                  ativo: data.ativo !== false,
                  createdAt: data.createdAt || '',
                  isFirstLogin: !!data.isFirstLogin,
                } as User;
              })
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          );
        },
        fail('usuarios')
      )
    );
  }

  // Notificações direcionadas exclusivamente ao usuário logado (por UID ou pelo seu perfil)
  let directNotifs: AppNotification[] = [];
  let roleNotifs: AppNotification[] = [];

  const emitMergedNotifications = () => {
    const byId = new Map<string, AppNotification>();
    for (const item of [...directNotifs, ...roleNotifs]) {
      byId.set(item.id, item);
    }
    const merged = Array.from(byId.values())
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, 50);
    callbacks.onNotifications(merged);
  };

  const mapNotifDoc = (d: { id: string; data: () => Record<string, unknown> }): AppNotification => {
    const data = d.data();
    const readBy = Array.isArray(data.readBy) ? (data.readBy as string[]) : [];
    const recipientRoles = Array.isArray(data.recipientRoles)
      ? (data.recipientRoles as UserRole[])
      : [];
    return {
      id: d.id,
      title: String(data.title || ''),
      message: String(data.message || ''),
      date: String(data.date || ''),
      read: readBy.includes(callbacks.uid),
      recipientUid: String(data.recipientUid || ''),
      recipientRoles,
      readBy,
      senderUid: String(data.senderUid || ''),
      criadoEm: toIsoString(data.criadoEm),
    };
  };

  const failNotif = (err: unknown) => {
    console.warn('Falha ao escutar notificações no Firestore:', err);
  };

  unsubs.push(
    onSnapshot(
      query(collection(db, 'notificacoes'), where('recipientUid', '==', callbacks.uid)),
      (snap) => {
        directNotifs = snap.docs.map((d) => mapNotifDoc(d));
        emitMergedNotifications();
      },
      failNotif
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'notificacoes'), where('recipientRoles', 'array-contains', callbacks.role)),
      (snap) => {
        roleNotifs = snap.docs.map((d) => mapNotifDoc(d));
        emitMergedNotifications();
      },
      failNotif
    )
  );

  return () => unsubs.forEach((u) => u());
}
