import {
  User,
  AdvanceRequest,
  CadastroPrestador,
  NotaFiscalEquipe,
  ComprovanteServico,
  AuditoriaEntry,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'admin-root',
    name: 'Administrador AMETA',
    email: 'blabluki@gmail.com',
    cpfCnpj: '',
    phone: '',
    role: 'admin',
    active: true,
    ativo: true,
    createdAt: '2026-11-25',
    isFirstLogin: true,
  },
];

export const INITIAL_REQUESTS: AdvanceRequest[] = [];

export const INITIAL_CADASTROS: CadastroPrestador[] = [];

export const INITIAL_NOTAS_EQUIPE: NotaFiscalEquipe[] = [];

export const INITIAL_COMPROVANTES: ComprovanteServico[] = [];

export const INITIAL_AUDITORIA: AuditoriaEntry[] = [];

