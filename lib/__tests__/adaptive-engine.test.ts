/**
 * Testes do motor de fluxo condicional e dos schemas adaptativos.
 *
 * O que estes testes protegem:
 * - `showIf` é o mesmo mecanismo para ramo clínico e para contexto de plantão;
 * - campo pulado vira `(CONFERIR)` no texto, nunca some;
 * - voltar atrás numa ramificação invalida o ramo aberto (sem resposta órfã);
 * - escala publicada nunca é totalizada com domínio faltando.
 */

import {
  PULADO,
  condicaoSatisfeita,
  desfazer,
  gerarDocumento,
  perguntasVisiveis,
  progresso,
  proximaPergunta,
  pular,
  responder,
  fmtNumero,
  MARCA_CONFERIR,
  type Respostas,
  type Schema,
} from '../evolucao/adaptive-engine';
import {
  SCHEMAS_ADAPTATIVOS,
  SETOR_CENTRO_CIRURGICO,
  SETOR_CLINICA_MEDICA,
  SETOR_NEFROLOGIA,
  SETOR_UTI,
  TITULOS_DE_BLOCO,
  getSchemaAdaptativo,
  schemaEvolucaoGeral,
  schemaMedicacao,
  schemaIntercorrencia,
} from '../evolucao/adaptive-schemas';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Responde o fluxo inteiro usando um mapa id → valor; pula o que não estiver no mapa. */
function percorrer(schema: Schema, respostasDesejadas: Record<string, string | number | boolean>): Respostas {
  let estado: Respostas = {};
  for (let i = 0; i < 500; i += 1) {
    const pergunta = proximaPergunta(schema, estado);
    if (!pergunta) return estado;
    estado = pergunta.id in respostasDesejadas
      ? responder(estado, pergunta.id, respostasDesejadas[pergunta.id])
      : pular(estado, pergunta.id);
  }
  throw new Error('Fluxo não terminou — provável showIf circular');
}

const NUCLEO_SEM_RAMOS = {
  consciencia: 'Consciente e orientado',
  temperatura: 36.5,
  dispositivos: 'AVP em MSD nº 20',
  tem_dor: false,
  tem_curativo: false,
};

// ─── condicaoSatisfeita ─────────────────────────────────────────────────────

describe('condicaoSatisfeita', () => {
  test('sem showIf a pergunta é sempre visível', () => {
    expect(condicaoSatisfeita(undefined, {})).toBe(true);
  });

  test('igualdade estrita: todas as chaves precisam bater', () => {
    expect(condicaoSatisfeita({ a: true, b: 'x' }, { a: true, b: 'x' })).toBe(true);
    expect(condicaoSatisfeita({ a: true, b: 'x' }, { a: true, b: 'y' })).toBe(false);
    expect(condicaoSatisfeita({ a: true }, { a: false })).toBe(false);
  });

  test('array significa "qualquer um destes valores"', () => {
    expect(condicaoSatisfeita({ q: ['Pequena', 'Grande'] }, { q: 'Grande' })).toBe(true);
    expect(condicaoSatisfeita({ q: ['Pequena', 'Grande'] }, { q: 'Ausente' })).toBe(false);
  });

  test('resposta pulada não satisfaz condição — o ramo não abre', () => {
    expect(condicaoSatisfeita({ tem_dor: true }, { tem_dor: PULADO })).toBe(false);
  });

  test('showIf com valor false bate quando a resposta é false, não quando é indefinida', () => {
    expect(condicaoSatisfeita({ uti_sedacao: false }, { uti_sedacao: false })).toBe(true);
    expect(condicaoSatisfeita({ uti_sedacao: false }, {})).toBe(false);
  });
});

// ─── Fluxo ──────────────────────────────────────────────────────────────────

describe('proximaPergunta', () => {
  test('a primeira pergunta da Evolução Geral é o setor', () => {
    expect(proximaPergunta(schemaEvolucaoGeral, {})?.id).toBe('setor');
  });

  test('pergunta já respondida não é repetida', () => {
    const estado = responder({}, 'setor', SETOR_UTI);
    expect(proximaPergunta(schemaEvolucaoGeral, estado)?.id).not.toBe('setor');
  });

  test('pergunta pulada não é repetida — PULADO é distinto de indefinido', () => {
    const estado = pular({}, 'setor');
    expect(proximaPergunta(schemaEvolucaoGeral, estado)?.id).not.toBe('setor');
  });

  test('fluxo termina (null) quando tudo que está visível foi respondido', () => {
    const estado = percorrer(schemaEvolucaoGeral, { setor: SETOR_UTI, ...NUCLEO_SEM_RAMOS });
    expect(proximaPergunta(schemaEvolucaoGeral, estado)).toBeNull();
  });

  test('todos os schemas registrados terminam sem laço', () => {
    for (const schema of SCHEMAS_ADAPTATIVOS) {
      const estado = percorrer(schema, {});
      expect(proximaPergunta(schema, estado)).toBeNull();
    }
  });
});

// ─── Ramificação por setor (contexto do plantão) ────────────────────────────

describe('ramificação por setor', () => {
  const idsVisiveis = (setor: string): string[] => {
    const estado = percorrer(schemaEvolucaoGeral, { setor, ...NUCLEO_SEM_RAMOS });
    return perguntasVisiveis(schemaEvolucaoGeral, estado).map((p) => p.id);
  };

  test('Nefrologia/HD abre o bloco de cateter e nenhum outro bloco de setor', () => {
    const ids = idsVisiveis(SETOR_NEFROLOGIA);
    expect(ids).toContain('hd_vias_permeaveis');
    expect(ids).not.toContain('po_aldrete_atividade');
    expect(ids).not.toContain('uti_via_aerea');
    expect(ids).not.toContain('cm_news2_aplicado');
  });

  test('Clínica Médica abre o bloco de escalas e cuidados', () => {
    const ids = idsVisiveis(SETOR_CLINICA_MEDICA);
    expect(ids).toContain('cm_news2_aplicado');
    expect(ids).toContain('cm_mobilidade');
    expect(ids).not.toContain('hd_vias_permeaveis');
  });

  test('Centro Cirúrgico abre os 5 domínios de Aldrete-Kroulik', () => {
    const ids = idsVisiveis(SETOR_CENTRO_CIRURGICO);
    expect(ids).toEqual(
      expect.arrayContaining([
        'po_aldrete_atividade',
        'po_aldrete_respiracao',
        'po_aldrete_circulacao',
        'po_aldrete_consciencia',
        'po_aldrete_saturacao',
      ]),
    );
    expect(ids).not.toContain('uti_via_aerea');
  });

  test('UTI abre o bloco de suporte intensivo', () => {
    const ids = idsVisiveis(SETOR_UTI);
    expect(ids).toContain('uti_via_aerea');
    expect(ids).toContain('uti_sedacao');
    expect(ids).not.toContain('po_aldrete_atividade');
  });

  test('sem setor respondido, nenhum bloco de setor aparece — só o núcleo', () => {
    const estado = pular({}, 'setor');
    const ids = perguntasVisiveis(schemaEvolucaoGeral, estado).map((p) => p.id);
    expect(ids).toContain('consciencia');
    expect(ids).not.toContain('hd_vias_permeaveis');
    expect(ids).not.toContain('cm_news2_aplicado');
    expect(ids).not.toContain('po_aldrete_atividade');
    expect(ids).not.toContain('uti_via_aerea');
  });
});

// ─── Ramificação clínica (mesmo mecanismo) ──────────────────────────────────

describe('ramificação clínica', () => {
  test('tem_dor abre o bloco de dor; falso não abre', () => {
    const comDor = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      ...NUCLEO_SEM_RAMOS,
      tem_dor: true,
      dor_local: 'flanco direito',
      dor_escore: 7,
    });
    const ids = perguntasVisiveis(schemaEvolucaoGeral, comDor).map((p) => p.id);
    expect(ids).toContain('dor_escore');

    const semDor = percorrer(schemaEvolucaoGeral, { setor: SETOR_CLINICA_MEDICA, ...NUCLEO_SEM_RAMOS });
    expect(perguntasVisiveis(schemaEvolucaoGeral, semDor).map((p) => p.id)).not.toContain('dor_escore');
  });

  test('estágio de LPP só é perguntado quando o tipo é lesão por pressão', () => {
    const lpp = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      ...NUCLEO_SEM_RAMOS,
      tem_curativo: true,
      curativo_tipo: 'Lesão por pressão',
    });
    expect(perguntasVisiveis(schemaEvolucaoGeral, lpp).map((p) => p.id)).toContain('lpp_estagio');

    const operatoria = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      ...NUCLEO_SEM_RAMOS,
      tem_curativo: true,
      curativo_tipo: 'Ferida operatória',
    });
    expect(perguntasVisiveis(schemaEvolucaoGeral, operatoria).map((p) => p.id)).not.toContain('lpp_estagio');
  });

  test('tipo de exsudato só é perguntado quando há exsudato (showIf com array)', () => {
    const comExsudato = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      ...NUCLEO_SEM_RAMOS,
      tem_curativo: true,
      curativo_tipo: 'Ferida operatória',
      curativo_exsudato_qtd: 'Moderada',
    });
    expect(perguntasVisiveis(schemaEvolucaoGeral, comExsudato).map((p) => p.id))
      .toContain('curativo_exsudato_tipo');

    const semExsudato = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      ...NUCLEO_SEM_RAMOS,
      tem_curativo: true,
      curativo_tipo: 'Ferida operatória',
      curativo_exsudato_qtd: 'Ausente',
    });
    expect(perguntasVisiveis(schemaEvolucaoGeral, semExsudato).map((p) => p.id))
      .not.toContain('curativo_exsudato_tipo');
  });

  test('UTI: sob sedação pergunta RASS; sem sedação pergunta Glasgow — nunca os dois', () => {
    const sedado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_UTI,
      ...NUCLEO_SEM_RAMOS,
      uti_sedacao: true,
    });
    const idsSedado = perguntasVisiveis(schemaEvolucaoGeral, sedado).map((p) => p.id);
    expect(idsSedado).toContain('uti_rass');
    expect(idsSedado).not.toContain('uti_glasgow');

    const semSedacao = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_UTI,
      ...NUCLEO_SEM_RAMOS,
      uti_sedacao: false,
    });
    const idsSem = perguntasVisiveis(schemaEvolucaoGeral, semSedacao).map((p) => p.id);
    expect(idsSem).toContain('uti_glasgow');
    expect(idsSem).not.toContain('uti_rass');
  });

  test('medicação: motivo da não administração só aparece quando não foi administrado', () => {
    const naoAdministrado = percorrer(schemaMedicacao, {
      med_nome: 'Dipirona',
      med_via: 'Via oral',
      med_administrado: false,
    });
    const ids = perguntasVisiveis(schemaMedicacao, naoAdministrado).map((p) => p.id);
    expect(ids).toContain('med_nao_motivo');
    expect(ids).not.toContain('med_reacao');
  });

  test('medicação: pergunta de trituração só existe para sonda enteral', () => {
    const sonda = percorrer(schemaMedicacao, { med_via: 'Sonda enteral' });
    expect(perguntasVisiveis(schemaMedicacao, sonda).map((p) => p.id)).toContain('med_trituracao');

    const oral = percorrer(schemaMedicacao, { med_via: 'Via oral' });
    expect(perguntasVisiveis(schemaMedicacao, oral).map((p) => p.id)).not.toContain('med_trituracao');
  });

  test('intercorrência: cada tipo abre só o seu ramo', () => {
    const queda = percorrer(schemaIntercorrencia, { int_tipo: 'Queda' });
    const idsQueda = perguntasVisiveis(schemaIntercorrencia, queda).map((p) => p.id);
    expect(idsQueda).toContain('int_queda_dano');
    expect(idsQueda).not.toContain('int_pcr_ritmo');
    expect(idsQueda).toContain('int_conduta'); // fechamento comum

    const pcr = percorrer(schemaIntercorrencia, { int_tipo: 'Parada cardiorrespiratória' });
    const idsPcr = perguntasVisiveis(schemaIntercorrencia, pcr).map((p) => p.id);
    expect(idsPcr).toContain('int_pcr_desfecho');
    expect(idsPcr).not.toContain('int_queda_dano');
  });
});

// ─── desfazer ───────────────────────────────────────────────────────────────

describe('desfazer', () => {
  test('trocar o setor descarta as respostas do bloco de setor anterior', () => {
    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_NEFROLOGIA,
      ...NUCLEO_SEM_RAMOS,
      hd_vias_permeaveis: true,
      hd_curativo_cateter: 'Limpo e seco',
    });
    expect(estado.hd_vias_permeaveis).toBe(true);

    const limpo = desfazer(schemaEvolucaoGeral, estado, 'setor');
    expect(limpo.setor).toBeUndefined();
    expect(limpo.hd_vias_permeaveis).toBeUndefined();
    expect(limpo.hd_curativo_cateter).toBeUndefined();
    // O núcleo universal não depende do setor — permanece.
    expect(limpo.consciencia).toBe('Consciente e orientado');
  });

  test('invalida ramificação em cascata (curativo → tipo → estágio)', () => {
    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      ...NUCLEO_SEM_RAMOS,
      tem_curativo: true,
      curativo_tipo: 'Lesão por pressão',
      lpp_estagio: 'Estágio 1 — eritema não branqueável em pele íntegra',
      curativo_exsudato_qtd: 'Moderada',
      curativo_exsudato_tipo: 'Seroso',
    });
    expect(estado.lpp_estagio).toBeDefined();

    const limpo = desfazer(schemaEvolucaoGeral, estado, 'tem_curativo');
    expect(limpo.curativo_tipo).toBeUndefined();
    expect(limpo.lpp_estagio).toBeUndefined();
    expect(limpo.curativo_exsudato_tipo).toBeUndefined();
  });
});

// ─── Progresso ──────────────────────────────────────────────────────────────

describe('progresso', () => {
  test('parte de zero e chega a 1 no fim do fluxo', () => {
    expect(progresso(schemaEvolucaoGeral, {}).fracao).toBe(0);
    const fim = percorrer(schemaEvolucaoGeral, { setor: SETOR_UTI, ...NUCLEO_SEM_RAMOS });
    expect(progresso(schemaEvolucaoGeral, fim).fracao).toBe(1);
  });

  test('abrir um ramo aumenta o total de perguntas visíveis', () => {
    const base = responder(responder({}, 'setor', SETOR_CLINICA_MEDICA), 'tem_dor', false);
    const comDor = responder(responder({}, 'setor', SETOR_CLINICA_MEDICA), 'tem_dor', true);
    expect(progresso(schemaEvolucaoGeral, comDor).visiveis)
      .toBeGreaterThan(progresso(schemaEvolucaoGeral, base).visiveis);
  });
});

// ─── Geração ────────────────────────────────────────────────────────────────

describe('gerarDocumento', () => {
  test('campo pulado vira (CONFERIR) marcado, nunca sumido', () => {
    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      consciencia: 'Consciente e orientado',
      // temperatura e dispositivos ficam pulados
      tem_dor: false,
      tem_curativo: false,
    });
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);

    expect(doc.totalConferir).toBeGreaterThan(0);
    expect(doc.texto).toContain(MARCA_CONFERIR);

    const marcados = doc.secoes.flatMap((s) => s.trechos).filter((t) => t.conferir);
    expect(marcados.length).toBe(doc.totalConferir);
    // Todo trecho marcado carrega a marca no próprio texto — a UI desenha a borda por cima.
    for (const trecho of marcados) expect(trecho.texto).toContain(MARCA_CONFERIR);
  });

  test('documento sem nenhum campo pulado não tem (CONFERIR)', () => {
    const estado = percorrer(schemaMedicacao, {
      med_nome: 'Ceftriaxona',
      med_dose: '1 g',
      med_via: 'Endovenosa',
      med_horario: '14:00',
      med_checagem_tripla: true,
      med_administrado: true,
      med_reacao: false,
    });
    const doc = gerarDocumento(schemaMedicacao, estado, TITULOS_DE_BLOCO);
    expect(doc.totalConferir).toBe(0);
    expect(doc.texto).not.toContain(MARCA_CONFERIR);
    expect(doc.texto).toContain('Ceftriaxona');
    expect(doc.texto).toContain('13 certos');
  });

  test('resposta de bloco que não está mais visível não vaza para o documento', () => {
    // Estado inconsistente à mão: resposta de HD sem o setor correspondente.
    const estado: Respostas = {
      setor: SETOR_UTI,
      consciencia: 'Consciente e orientado',
      hd_vias_permeaveis: true,
    };
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);
    expect(doc.texto).not.toContain('hemodiálise');
  });

  test('o texto plano sempre termina com assinatura e aviso de revisão COREN', () => {
    const estado = percorrer(schemaEvolucaoGeral, { setor: SETOR_UTI, ...NUCLEO_SEM_RAMOS });
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);
    expect(doc.texto).toContain('Enfermeiro(a) Responsável — [data/hora]');
    expect(doc.texto).toContain('revisar e assinar (COREN)');
  });

  test('todo schema declara pelo menos uma fonte clínica', () => {
    for (const schema of SCHEMAS_ADAPTATIVOS) {
      expect(schema.fontes.length).toBeGreaterThan(0);
    }
  });

  test('decimais saem com vírgula (padrão brasileiro)', () => {
    expect(fmtNumero(36.5, 1)).toBe('36,5');
    expect(fmtNumero(7)).toBe('7');

    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      ...NUCLEO_SEM_RAMOS,
      temperatura: 38.7,
    });
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);
    expect(doc.texto).toContain('38,7 °C');
    expect(doc.texto).not.toContain('38.7');
  });

  test('valor aferido nunca vira rótulo clínico', () => {
    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CLINICA_MEDICA,
      ...NUCLEO_SEM_RAMOS,
      temperatura: 38.7,
    });
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);
    expect(doc.texto.toLowerCase()).not.toContain('hipertermia');
    expect(doc.texto.toLowerCase()).not.toContain('febril');
  });
});

// ─── Aldrete-Kroulik ────────────────────────────────────────────────────────

describe('Aldrete-Kroulik no bloco de pós-operatório', () => {
  const ALDRETE_MAX = {
    po_aldrete_atividade: 'Move os 4 membros voluntariamente ou sob comando',
    po_aldrete_respiracao: 'Respira profundamente e tosse livremente',
    po_aldrete_circulacao: 'PA ± 20% do nível pré-anestésico',
    po_aldrete_consciencia: 'Completamente desperto',
    po_aldrete_saturacao: 'SpO₂ > 92% em ar ambiente',
  };

  test('totaliza 10/10 com os 5 domínios no valor máximo', () => {
    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CENTRO_CIRURGICO,
      ...NUCLEO_SEM_RAMOS,
      ...ALDRETE_MAX,
    });
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);
    expect(doc.texto).toContain('Índice de Aldrete-Kroulik: 10/10');
  });

  test('soma corretamente um caso intermediário (2+1+2+1+1 = 7)', () => {
    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CENTRO_CIRURGICO,
      ...NUCLEO_SEM_RAMOS,
      po_aldrete_atividade: 'Move os 4 membros voluntariamente ou sob comando',
      po_aldrete_respiracao: 'Dispneia ou respiração limitada',
      po_aldrete_circulacao: 'PA ± 20% do nível pré-anestésico',
      po_aldrete_consciencia: 'Desperta ao chamado',
      po_aldrete_saturacao: 'Necessita O₂ para manter SpO₂ > 90%',
    });
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);
    expect(doc.texto).toContain('Índice de Aldrete-Kroulik: 7/10');
  });

  test('domínio pulado não gera total parcial', () => {
    const parcial = { ...ALDRETE_MAX } as Record<string, string>;
    delete parcial.po_aldrete_circulacao;

    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CENTRO_CIRURGICO,
      ...NUCLEO_SEM_RAMOS,
      ...parcial,
    });
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);
    expect(doc.texto).toContain('não totalizado');
    expect(doc.texto).not.toMatch(/Aldrete-Kroulik: \d+\/10/);
    expect(doc.texto).toContain(MARCA_CONFERIR);
  });

  test('escore ≥ 8 nunca declara alta — a decisão permanece médica', () => {
    const estado = percorrer(schemaEvolucaoGeral, {
      setor: SETOR_CENTRO_CIRURGICO,
      ...NUCLEO_SEM_RAMOS,
      ...ALDRETE_MAX,
    });
    const doc = gerarDocumento(schemaEvolucaoGeral, estado, TITULOS_DE_BLOCO);
    expect(doc.texto).toContain('decisão médica');
    expect(doc.texto).toContain('COREN-SP nº 017/2021');
    expect(doc.texto).not.toMatch(/liberad[oa] (para alta|da SRPA)/i);
  });
});

// ─── Integridade dos schemas ────────────────────────────────────────────────

describe('integridade dos schemas', () => {
  test('ids de pergunta são únicos dentro de cada schema', () => {
    for (const schema of SCHEMAS_ADAPTATIVOS) {
      const ids = schema.perguntas.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('todo showIf referencia uma pergunta que existe e vem antes', () => {
    for (const schema of SCHEMAS_ADAPTATIVOS) {
      const vistos = new Set<string>();
      for (const pergunta of schema.perguntas) {
        for (const chave of Object.keys(pergunta.showIf ?? {})) {
          expect(vistos.has(chave)).toBe(true);
        }
        vistos.add(pergunta.id);
      }
    }
  });

  test('toda pergunta de opção tem opções, e todo bloco tem título', () => {
    for (const schema of SCHEMAS_ADAPTATIVOS) {
      for (const pergunta of schema.perguntas) {
        if (pergunta.tipo === 'opcao') {
          expect(pergunta.opcoes?.length ?? 0).toBeGreaterThan(0);
        }
        expect(TITULOS_DE_BLOCO[pergunta.bloco]).toBeDefined();
      }
    }
  });

  test('todo showIf de opção usa um valor que existe nas opções da pergunta alvo', () => {
    for (const schema of SCHEMAS_ADAPTATIVOS) {
      const porId = new Map(schema.perguntas.map((p) => [p.id, p]));
      for (const pergunta of schema.perguntas) {
        for (const [chave, esperado] of Object.entries(pergunta.showIf ?? {})) {
          const alvo = porId.get(chave);
          if (!alvo || alvo.tipo !== 'opcao') continue;
          for (const valor of Array.isArray(esperado) ? esperado : [esperado]) {
            expect(alvo.opcoes).toContain(valor);
          }
        }
      }
    }
  });

  test('getSchemaAdaptativo resolve por id e devolve undefined para id desconhecido', () => {
    expect(getSchemaAdaptativo('evolucaogeral')?.nome).toBe('Evolução');
    expect(getSchemaAdaptativo('inexistente')).toBeUndefined();
  });

  test('todo chip nasce nomeado — nenhum schema genérico tipo "Novo Registro"', () => {
    for (const schema of SCHEMAS_ADAPTATIVOS) {
      expect(schema.nome.trim()).not.toBe('');
      expect(schema.nome.toLowerCase()).not.toContain('novo registro');
    }
  });
});
