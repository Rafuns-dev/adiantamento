import { UserRole } from '../types';

export interface RoleMeta {
  label: string;
  shortLabel: string;
  badgeClass: string;
  headerBadgeClass: string;
  dotClass: string;
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  admin: {
    label: 'Administrador (Financeiro & Coordenação)',
    shortLabel: 'Fin. & Coordenação',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
    headerBadgeClass: 'bg-purple-50 border-purple-200 text-purple-900',
    dotClass: 'bg-purple-600',
  },
  operador: {
    label: 'Vistoriador Externo',
    shortLabel: 'Vistoriador Externo',
    badgeClass: 'bg-sky-100 text-sky-800 border border-sky-200',
    headerBadgeClass: 'bg-sky-50 border-sky-200 text-sky-900',
    dotClass: 'bg-sky-600',
  },
  financeiro: {
    label: 'Financeiro & Coordenação',
    shortLabel: 'Fin. & Coordenação',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    headerBadgeClass: 'bg-amber-50 border-amber-200 text-amber-900',
    dotClass: 'bg-amber-600',
  },
  vistoria_nota: {
    label: 'Vistoriador Externo – Notas',
    shortLabel: 'Vistoriador Externo',
    badgeClass: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    headerBadgeClass: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    dotClass: 'bg-indigo-600',
  },
  vistoria_ameta: {
    label: 'Vistoriador AMETA – Comprovantes',
    shortLabel: 'Vistoriador AMETA',
    badgeClass: 'bg-teal-100 text-teal-800 border border-teal-200',
    headerBadgeClass: 'bg-teal-50 border-teal-200 text-teal-900',
    dotClass: 'bg-teal-600',
  },
};
