import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  collection,
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

const VALID_16_FIELDS = {
  nome: 'João Ferreira Prestador',
  cpf: '111.222.333-44',
  rg: '12.345.678-9',
  dataNascimento: '1988-05-14',
  filiacaoMae: 'Maria Ferreira',
  filiacaoPai: 'José Ferreira',
  funcao: 'Técnico de Torre',
  empresa: 'JF Engenharia Ltda',
  cnpj: '12.345.678/0001-90',
  telefone: '(11) 99999-8888',
  email: 'joao@jfengenharia.com.br',
  cep: '01310-100',
  endereco: 'Av. Paulista, 1000',
  cidadeUf: 'São Paulo / SP',
  dadosBancarios: 'Banco Itaú (341) Ag 0001 CC 12345-6',
  chavePix: '12345678000190',
};

describe('AMETA - Regras de Segurança Firestore e Storage (Emulator)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'ameta-test-project',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
      storage: {
        rules: readFileSync('storage.rules', 'utf8'),
        host: '127.0.0.1',
        port: 9199,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await setDoc(doc(db, 'usuarios', 'uid-admin'), {
        uid: 'uid-admin',
        name: 'Admin AMETA',
        email: 'admin@ameta.com.br',
        role: 'admin',
        ativo: true,
      });

      await setDoc(doc(db, 'usuarios', 'uid-nota-1'), {
        uid: 'uid-nota-1',
        name: 'Paulo Notas 1',
        email: 'nota1@ameta.com.br',
        role: 'vistoria_nota',
        ativo: true,
      });

      await setDoc(doc(db, 'usuarios', 'uid-nota-2'), {
        uid: 'uid-nota-2',
        name: 'Paula Notas 2',
        email: 'nota2@ameta.com.br',
        role: 'vistoria_nota',
        ativo: true,
      });

      await setDoc(doc(db, 'usuarios', 'uid-ameta'), {
        uid: 'uid-ameta',
        name: 'Fernanda Ameta',
        email: 'ameta@ameta.com.br',
        role: 'vistoria_ameta',
        ativo: true,
      });

      await setDoc(doc(db, 'cadastros', 'prest-1'), {
        ...VALID_16_FIELDS,
        status: 'Pendente',
        criadoEm: serverTimestamp(),
      });
    });
  });

  it('1. Equipe de nota cria nota: PERMITIDO. Equipe de nota envia comprovante: NEGADO.', async () => {
    const notaCtx = testEnv.authenticatedContext('uid-nota-1');
    const db = notaCtx.firestore();

    await assertSucceeds(
      setDoc(doc(db, 'notas', 'nota-001'), {
        prestadorId: 'prest-1',
        prestadorNome: 'João Ferreira Prestador',
        prestadorCnpj: '12.345.678/0001-90',
        numero: 'NF-001',
        dataEmissao: '2026-04-01',
        valor: 1500,
        descricao: 'Vistoria estrutural torre norte',
        status: 'Emitida',
        criadoPorUid: 'uid-nota-1',
        criadoPorNome: 'Paulo Notas 1',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      })
    );

    await assertFails(
      setDoc(doc(db, 'comprovantes', 'comp-001'), {
        notaId: 'nota-001',
        prestadorId: 'prest-1',
        descricao: 'Tentativa indevida pela equipe de nota',
        data: '2026-04-02',
        arquivoPath: 'comprovantes/nota-001/file.pdf',
        tipo: 'application/pdf',
        tamanho: 1024,
        criadoPorUid: 'uid-nota-1',
        criadoPorNome: 'Paulo Notas 1',
        criadoEm: serverTimestamp(),
      })
    );

    // Storage: equipe de nota envia PDF em notas/ (PERMITIDO) e tenta enviar em comprovantes/ (NEGADO)
    const storage = notaCtx.storage();
    const pdfBytes = new Uint8Array([37, 80, 68, 70]);
    await assertSucceeds(
      uploadBytes(ref(storage, 'notas/nota-001/nf.pdf'), pdfBytes, {
        contentType: 'application/pdf',
      })
    );
    await assertFails(
      uploadBytes(ref(storage, 'comprovantes/nota-001/comp.pdf'), pdfBytes, {
        contentType: 'application/pdf',
      })
    );
  });

  it('2. Equipe Ameta anexa comprovante a nota existente: PERMITIDO. Sem nota existente: NEGADO. Cria nota: NEGADO.', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notas', 'nota-002'), {
        prestadorId: 'prest-1',
        prestadorNome: 'João Ferreira Prestador',
        prestadorCnpj: '12.345.678/0001-90',
        numero: 'NF-002',
        dataEmissao: '2026-04-01',
        valor: 2200,
        descricao: 'Manutenção preventiva',
        status: 'Aguardando comprovante',
        criadoPorUid: 'uid-nota-1',
        criadoPorNome: 'Paulo Notas 1',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
    });

    const ametaCtx = testEnv.authenticatedContext('uid-ameta');
    const db = ametaCtx.firestore();

    // Comprovante em nota existente: PERMITIDO
    await assertSucceeds(
      setDoc(doc(db, 'comprovantes', 'comp-ok'), {
        notaId: 'nota-002',
        prestadorId: 'prest-1',
        descricao: 'Foto do serviço concluído',
        data: '2026-04-03',
        arquivoPath: 'comprovantes/nota-002/foto.jpg',
        tipo: 'image/jpeg',
        tamanho: 2048,
        criadoPorUid: 'uid-ameta',
        criadoPorNome: 'Fernanda Ameta',
        criadoEm: serverTimestamp(),
      })
    );

    // Atualiza status da nota para Comprovada: PERMITIDO
    await assertSucceeds(
      updateDoc(doc(db, 'notas', 'nota-002'), {
        status: 'Comprovada',
        atualizadoEm: serverTimestamp(),
      })
    );

    // Comprovante para nota inexistente: NEGADO
    await assertFails(
      setDoc(doc(db, 'comprovantes', 'comp-sem-nota'), {
        notaId: 'nota-inexistente',
        prestadorId: 'prest-1',
        descricao: 'Comprovante órfão',
        data: '2026-04-03',
        arquivoPath: 'comprovantes/nota-inexistente/foto.jpg',
        tipo: 'image/jpeg',
        tamanho: 2048,
        criadoPorUid: 'uid-ameta',
        criadoPorNome: 'Fernanda Ameta',
        criadoEm: serverTimestamp(),
      })
    );

    // Equipe Ameta tenta criar nota: NEGADO
    await assertFails(
      setDoc(doc(db, 'notas', 'nota-ameta-indevida'), {
        prestadorId: 'prest-1',
        prestadorNome: 'João Ferreira Prestador',
        prestadorCnpj: '12.345.678/0001-90',
        numero: 'NF-999',
        dataEmissao: '2026-04-01',
        valor: 500,
        descricao: 'Nota indevida',
        status: 'Emitida',
        criadoPorUid: 'uid-ameta',
        criadoPorNome: 'Fernanda Ameta',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      })
    );

    // Storage: Ameta envia JPEG em comprovantes/ (PERMITIDO) e tenta enviar em notas/ (NEGADO)
    const storage = ametaCtx.storage();
    const imgBytes = new Uint8Array([255, 216, 255]);
    await assertSucceeds(
      uploadBytes(ref(storage, 'comprovantes/nota-002/foto.jpg'), imgBytes, {
        contentType: 'image/jpeg',
      })
    );
    await assertFails(
      uploadBytes(ref(storage, 'notas/nota-002/xml.xml'), imgBytes, {
        contentType: 'application/xml',
      })
    );
  });

  it('3. Equipe de nota edita nota criada por outro usuário: NEGADO.', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notas', 'nota-outro'), {
        prestadorId: 'prest-1',
        prestadorNome: 'João Ferreira Prestador',
        prestadorCnpj: '12.345.678/0001-90',
        numero: 'NF-003',
        dataEmissao: '2026-04-01',
        valor: 1000,
        descricao: 'Nota criada pelo usuario 1',
        status: 'Emitida',
        criadoPorUid: 'uid-nota-1',
        criadoPorNome: 'Paulo Notas 1',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
    });

    const nota2Ctx = testEnv.authenticatedContext('uid-nota-2');
    await assertFails(
      updateDoc(doc(nota2Ctx.firestore(), 'notas', 'nota-outro'), {
        valor: 9999,
        atualizadoEm: serverTimestamp(),
      })
    );
  });

  it('4. Equipe Ameta edita ou apaga comprovante: NEGADO.', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notas', 'nota-004'), {
        prestadorId: 'prest-1',
        prestadorNome: 'João Ferreira Prestador',
        prestadorCnpj: '12.345.678/0001-90',
        numero: 'NF-004',
        dataEmissao: '2026-04-01',
        valor: 1200,
        descricao: 'Serviço 4',
        status: 'Aguardando comprovante',
        criadoPorUid: 'uid-nota-1',
        criadoPorNome: 'Paulo Notas 1',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      await setDoc(doc(ctx.firestore(), 'comprovantes', 'comp-imutavel'), {
        notaId: 'nota-004',
        prestadorId: 'prest-1',
        descricao: 'Original',
        data: '2026-04-03',
        arquivoPath: 'comprovantes/nota-004/orig.pdf',
        tipo: 'application/pdf',
        tamanho: 1024,
        criadoPorUid: 'uid-ameta',
        criadoPorNome: 'Fernanda Ameta',
        criadoEm: serverTimestamp(),
      });
    });

    const ametaCtx = testEnv.authenticatedContext('uid-ameta');
    const db = ametaCtx.firestore();

    await assertFails(
      updateDoc(doc(db, 'comprovantes', 'comp-imutavel'), {
        descricao: 'Alterado',
      })
    );
    await assertFails(deleteDoc(doc(db, 'comprovantes', 'comp-imutavel')));
  });

  it('5. Visitante sem login lê qualquer coisa de notas, comprovantes ou Storage: NEGADO.', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notas', 'nota-005'), {
        prestadorId: 'prest-1',
        prestadorNome: 'João Ferreira Prestador',
        prestadorCnpj: '12.345.678/0001-90',
        numero: 'NF-005',
        dataEmissao: '2026-04-01',
        valor: 800,
        descricao: 'Teste leitura anonima',
        status: 'Emitida',
        criadoPorUid: 'uid-nota-1',
        criadoPorNome: 'Paulo Notas 1',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      await uploadBytes(
        ref(ctx.storage(), 'notas/nota-005/doc.pdf'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'application/pdf' }
      );
    });

    const unauthCtx = testEnv.unauthenticatedContext();
    const db = unauthCtx.firestore();
    const storage = unauthCtx.storage();

    await assertFails(getDoc(doc(db, 'notas', 'nota-005')));
    await assertFails(getDocs(collection(db, 'notas')));
    await assertFails(getDocs(collection(db, 'comprovantes')));
    await assertFails(getDocs(collection(db, 'cadastros')));
    await assertFails(getBytes(ref(storage, 'notas/nota-005/doc.pdf')));
  });

  it('6. Só o admin exclui nota, comprovante ou arquivo.', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notas', 'nota-006'), {
        prestadorId: 'prest-1',
        prestadorNome: 'João Ferreira Prestador',
        prestadorCnpj: '12.345.678/0001-90',
        numero: 'NF-006',
        dataEmissao: '2026-04-01',
        valor: 900,
        descricao: 'Para exclusão',
        status: 'Emitida',
        criadoPorUid: 'uid-nota-1',
        criadoPorNome: 'Paulo Notas 1',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      await setDoc(doc(ctx.firestore(), 'comprovantes', 'comp-006'), {
        notaId: 'nota-006',
        prestadorId: 'prest-1',
        descricao: 'Para exclusão',
        data: '2026-04-03',
        arquivoPath: 'comprovantes/nota-006/c.pdf',
        tipo: 'application/pdf',
        tamanho: 500,
        criadoPorUid: 'uid-ameta',
        criadoPorNome: 'Fernanda Ameta',
        criadoEm: serverTimestamp(),
      });
      await uploadBytes(
        ref(ctx.storage(), 'comprovantes/nota-006/c.pdf'),
        new Uint8Array([1, 2, 3]),
        { contentType: 'application/pdf' }
      );
    });

    const notaCtx = testEnv.authenticatedContext('uid-nota-1');
    const ametaCtx = testEnv.authenticatedContext('uid-ameta');
    const adminCtx = testEnv.authenticatedContext('uid-admin');

    // Equipes não-admin não podem excluir
    await assertFails(deleteDoc(doc(notaCtx.firestore(), 'notas', 'nota-006')));
    await assertFails(deleteDoc(doc(ametaCtx.firestore(), 'comprovantes', 'comp-006')));
    await assertFails(deleteObject(ref(ametaCtx.storage(), 'comprovantes/nota-006/c.pdf')));

    // Admin pode excluir tudo
    await assertSucceeds(deleteDoc(doc(adminCtx.firestore(), 'comprovantes', 'comp-006')));
    await assertSucceeds(deleteDoc(doc(adminCtx.firestore(), 'notas', 'nota-006')));
    await assertSucceeds(deleteObject(ref(adminCtx.storage(), 'comprovantes/nota-006/c.pdf')));
  });

  it('7. Formulário público continua aceitando só os 16 campos.', async () => {
    const unauthCtx = testEnv.unauthenticatedContext();
    const db = unauthCtx.firestore();

    // Exatos 16 campos (+ status Pendente e criadoEm serverTimestamp): PERMITIDO
    await assertSucceeds(
      setDoc(doc(db, 'cadastros', 'cad-ok-16'), {
        ...VALID_16_FIELDS,
        status: 'Pendente',
        criadoEm: serverTimestamp(),
      })
    );

    // Campo extra não permitido: NEGADO
    await assertFails(
      setDoc(doc(db, 'cadastros', 'cad-extra'), {
        ...VALID_16_FIELDS,
        campoExtra: 'injeção',
        status: 'Pendente',
        criadoEm: serverTimestamp(),
      })
    );

    // Faltando um dos 16 campos (ex: chavePix): NEGADO
    const { chavePix: _, ...incompleto } = VALID_16_FIELDS;
    await assertFails(
      setDoc(doc(db, 'cadastros', 'cad-incompleto'), {
        ...incompleto,
        status: 'Pendente',
        criadoEm: serverTimestamp(),
      })
    );
  });
});
