/**
 * Setores — Caminho A: apresentação, não modelo clínico.
 *
 * Um setor NÃO tem campo próprio, regra própria nem lógica clínica própria.
 * Ele é só um agrupamento de tipos de documento que já existem em DOC_TYPES,
 * para encurtar o caminho até o registro certo. Nenhum dos 36 tipos foi
 * remapeado, nenhum FIELD_SCHEMA foi tocado.
 *
 * Consequência prática: adicionar ou remover setor aqui não muda nada do que
 * o motor gera — muda só por onde o enfermeiro chega até ele.
 */

import { DOC_TYPES, type DocType } from './document-types';

export interface Setor {
  id: string;
  nome: string;
  descricao: string;
  /** Nome do ícone em lucide-react. */
  icone: string;
  /** Agrupamento visual na tela. */
  grupo: string;
  /** Tipos de DOC_TYPES que aparecem primeiro neste setor. */
  tipos: string[];
  /**
   * Setor mapeado mas ainda NÃO exibido, aguardando validação clínica do
   * enfermeiro responsável. Ver lib/evolucao/campos-a-conferir.ts.
   * Liberar = trocar para false; nenhuma outra mudança é necessária.
   */
  pendenteValidacao?: boolean;
}

export const SETORES: Setor[] = [
  // ── Cuidados intensivos ───────────────────────────────────────────────────
  {
    id: 'uti',
    nome: 'UTI',
    descricao: 'Terapia intensiva — admissão, evolução, alta e transferência para enfermaria.',
    icone: 'activity',
    grupo: 'Cuidados intensivos',
    tipos: ['admissao_uti', 'evolucao_uti', 'alta_uti', 'transferencia_uti_enfermaria'],
  },
  {
    id: 'semi_intensiva',
    nome: 'Semi-intensiva',
    descricao: 'Unidade semi-intensiva com monitorização contínua.',
    icone: 'monitor-dot',
    grupo: 'Cuidados intensivos',
    tipos: ['admissao_semi_intensiva', 'evolucao_semi_intensiva', 'alta_semi_intensiva'],
  },

  // ── Enfermarias ───────────────────────────────────────────────────────────
  {
    id: 'clinica',
    nome: 'Enfermaria / Clínica',
    descricao: 'Paciente de enfermaria — admissão hospitalar, evolução de plantão e alta.',
    icone: 'stethoscope',
    grupo: 'Enfermarias',
    tipos: ['admissao_hospitalar', 'evolucao_plantao', 'alta_hospitalar', 'alta_a_pedido'],
  },

  // ── Especialidades ────────────────────────────────────────────────────────
  {
    id: 'hemodialise',
    nome: 'Hemodiálise',
    descricao: 'Sessão de hemodiálise — acesso vascular e balanço da sessão.',
    icone: 'droplets',
    grupo: 'Especialidades',
    tipos: ['evolucao_hemodialise'],
  },
  {
    id: 'oncologia',
    nome: 'Oncologia',
    descricao: 'Evolução em unidade oncológica.',
    icone: 'ribbon',
    grupo: 'Especialidades',
    tipos: ['evolucao_oncologia'],
  },

  // ── Materno-infantil ──────────────────────────────────────────────────────
  {
    id: 'gestante_cpn',
    nome: 'Gestante / Centro de Parto Normal',
    descricao: 'Trabalho de parto — períodos clínicos, dilatação, contrações e BCF.',
    icone: 'heart-pulse',
    grupo: 'Materno-infantil',
    tipos: ['evolucao_gestante'],
  },
  {
    id: 'puerperio',
    nome: 'Puerpério',
    descricao: 'Pós-parto — involução uterina, lóquios, mamas e períneo. Inclui a transição puerperal.',
    icone: 'heart-handshake',
    grupo: 'Materno-infantil',
    tipos: ['evolucao_puerperio', 'transicao_puerperal'],
  },

  // ── Urgência ──────────────────────────────────────────────────────────────
  {
    id: 'emergencia',
    nome: 'Emergência',
    descricao: 'Acolhimento em pronto-socorro, com classificação de risco.',
    icone: 'siren',
    grupo: 'Urgência',
    tipos: ['admissao_pronto_socorro'],
  },

  {
    id: 'pediatria',
    nome: 'Pediatria',
    descricao: 'Paciente pediátrico — peso, acompanhante e orientações ao responsável.',
    icone: 'smile',
    grupo: 'Enfermarias',
    tipos: ['evolucao_pediatrica'],
  },
  {
    id: 'neonatal',
    nome: 'UTI Neonatal',
    descricao: 'Recém-nascido — peso em gramas, Apgar, suporte térmico e fototerapia.',
    icone: 'baby',
    grupo: 'Cuidados intensivos',
    tipos: ['evolucao_neonatal'],
  },
];

/** Tipos que algum setor reivindica como próprio. */
const TIPOS_DE_SETOR = new Set(SETORES.flatMap((s) => s.tipos));

/**
 * Tipos disponíveis em QUALQUER setor: procedimentos, intercorrências,
 * transferências e registros específicos não são exclusivos de uma unidade.
 * "Avaliação de Ferida/Ostomia" entra aqui por decisão de produto.
 *
 * Um tipo já reivindicado por um setor NÃO entra aqui — "Alta UTI →
 * Enfermaria" é do grupo transferência, mas só faz sentido na UTI. Sem esse
 * filtro o tipo apareceria duas vezes na mesma lista.
 */
export const TIPOS_GLOBAIS: string[] = DOC_TYPES.filter(
  (d) =>
    !TIPOS_DE_SETOR.has(d.id) &&
    (d.grupo === 'procedimento' ||
      d.grupo === 'intercorrencia' ||
      d.grupo === 'especifico' ||
      d.grupo === 'transferencia'),
).map((d) => d.id);

/**
 * Intercorrências têm entrada própria na tela, fora da lista de setores.
 * Motivo: são urgentes e não devem exigir navegar setor → tipo. Continuam
 * também dentro de cada setor (são globais) — a entrada própria é atalho,
 * não exclusividade.
 */
export const TIPOS_INTERCORRENCIA: string[] = DOC_TYPES.filter(
  (d) => d.grupo === 'intercorrencia',
).map((d) => d.id);

export function tiposIntercorrencia(): DocType[] {
  return DOC_TYPES.filter((d) => d.grupo === 'intercorrencia');
}

/** Setores efetivamente exibidos hoje. */
export function setoresVisiveis(): Setor[] {
  return SETORES.filter((s) => !s.pendenteValidacao);
}

/** Setores visíveis agrupados, preservando a ordem de declaração. */
export function setoresPorGrupo(): { grupo: string; setores: Setor[] }[] {
  const out: { grupo: string; setores: Setor[] }[] = [];
  for (const s of setoresVisiveis()) {
    const atual = out.find((g) => g.grupo === s.grupo);
    if (atual) atual.setores.push(s);
    else out.push({ grupo: s.grupo, setores: [s] });
  }
  return out;
}

export function getSetor(id: string): Setor | undefined {
  return SETORES.find((s) => s.id === id);
}

/**
 * Tipos oferecidos num setor: os próprios primeiro, depois os globais.
 * Nada é escondido — o setor só reordena.
 */
export function tiposDoSetor(setorId: string): DocType[] {
  const setor = getSetor(setorId);
  if (!setor) return [];
  const ids = [...setor.tipos, ...TIPOS_GLOBAIS.filter((t) => !setor.tipos.includes(t))];
  return ids
    .map((id) => DOC_TYPES.find((d) => d.id === id))
    .filter((d): d is DocType => d !== undefined);
}

/**
 * Campos-preview do card do setor: os 3 primeiros campos REAIS do primeiro
 * tipo do setor que tenha FIELD_SCHEMA. Setor sem schema não mostra tag
 * nenhuma — preferimos card sem preview a preview inventado.
 */
export function camposPreview(setorId: string, getSchemaCampos: (tipoId: string) => string[]): string[] {
  const setor = getSetor(setorId);
  if (!setor) return [];
  for (const tipoId of setor.tipos) {
    const labels = getSchemaCampos(tipoId);
    if (labels.length > 0) return labels.slice(0, 3);
  }
  return [];
}
