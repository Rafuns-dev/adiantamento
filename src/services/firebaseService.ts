import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
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
} from '../types';

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

    task.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (error) => reject(error),
      () => resolve()
    );
  });

  return { arquivoPath, arquivoNome: file.name };
}

export async function getAuthenticatedDownloadUrl(arquivoPath: string): Promise<string> {
  const storageRef = ref(storage, arquivoPath);
  return getDownloadURL(storageRef);
}

export async function deleteStorageFile(arquivoPath?: string): Promise<void> {
  if (!arquivoPath) return;
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
  nota: Omit<NotaFiscalEquipe, 'criadoEm' | 'atualizadoEm' | 'arquivoData'>
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

    await setDoc(doc(db, 'notas', nota.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function atualizarNotaFirestore(
  id: string,
  updates: Partial<Omit<NotaFiscalEquipe, 'id' | 'criadoEm' | 'criadoPorUid' | 'arquivoData'>>
): Promise<void> {
  const path = `notas/${id}`;
  try {
    const payload: Record<string, unknown> = {
      ...updates,
      atualizadoEm: serverTimestamp(),
    };
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
  comp: Omit<ComprovanteServico, 'criadoEm' | 'arquivoData'>
): Promise<void> {
  const path = `comprovantes/${comp.id}`;
  try {
    const payload: Record<string, unknown> = {
      notaId: comp.notaId,
      prestadorId: comp.prestadorId,
      descricao: comp.descricao.slice(0, 500),
      data: comp.data.slice(0, 20),
      arquivoPath: comp.arquivoPath.slice(0, 500),
      tipo: comp.tipo,
      tamanho: Number(comp.tamanho),
      criadoPorUid: comp.criadoPorUid,
      criadoPorNome: comp.criadoPorNome.slice(0, 150),
      criadoEm: serverTimestamp(),
    };
    if (comp.categoria) payload.categoria = comp.categoria;
    if (comp.valor !== undefined && !Number.isNaN(comp.valor)) payload.valor = Number(comp.valor);
    if (comp.arquivoNome) payload.arquivoNome = comp.arquivoNome.slice(0, 250);

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
    await setDoc(doc(db, 'solicitacoes', req.id), {
      ...req,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeTeamCollections(callbacks: {
  onCadastros: (items: CadastroPrestador[]) => void;
  onNotas: (items: NotaFiscalEquipe[]) => void;
  onComprovantes: (items: ComprovanteServico[]) => void;
  onAuditoria: (items: AuditoriaEntry[]) => void;
  onRequests?: (items: AdvanceRequest[]) => void;
  onUsers?: (items: User[]) => void;
  isAdmin: boolean;
}): () => void {
  const unsubs: Array<() => void> = [];

  if (callbacks.onRequests) {
    unsubs.push(
      onSnapshot(
        query(collection(db, 'solicitacoes'), orderBy('createdAt', 'desc')),
        (snap) => {
          callbacks.onRequests?.(
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
        (err) => handleFirestoreError(err, OperationType.LIST, 'solicitacoes')
      )
    );
  }

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
      (err) => handleFirestoreError(err, OperationType.LIST, 'cadastros')
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
      (err) => handleFirestoreError(err, OperationType.LIST, 'notas')
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
      (err) => handleFirestoreError(err, OperationType.LIST, 'comprovantes')
    )
  );

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
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditoria')
    )
  );

  if (callbacks.isAdmin && callbacks.onUsers) {
    getDocs(collection(db, 'usuarios'))
      .then((snap) => {
        callbacks.onUsers?.(
          snap.docs.map((d) => {
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
            };
          })
        );
      })
      .catch((err) => handleFirestoreError(err, OperationType.LIST, 'usuarios'));
  }

  return () => unsubs.forEach((u) => u());
}
