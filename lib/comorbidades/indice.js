/**
 * Levantamento de comorbidades e procedimentos.
 *
 * ISTO NÃO É O ÍNDICE DE CHARLSON, e a diferença importa na hora de usar o
 * dado: o Charlson tem 19 condições com PESOS, que somados dão um escore
 * preditivo de mortalidade. Esta lista é um levantamento bem mais amplo, sem
 * peso e sem escore — serve para registrar o que o paciente tem, não para
 * calcular risco.
 *
 * Se um dia o escore de Charlson for necessário, ele é um cálculo à parte,
 * com os pesos da publicação original (Charlson et al., 1987) e a correção
 * por idade — nada disso pode ser deduzido daqui.
 *
 * A grafia foi padronizada para o português do Brasil: a lista de origem
 * misturava "Fibrilhação", "crónica" e "SIDA", que são de Portugal. O
 * conteúdo clínico é o mesmo.
 */

/** As três respostas possíveis. Só "sim" abre o campo de data. */
export const RESPOSTAS = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
  { valor: 'nao_avaliado', rotulo: 'Não avaliado' },
];

/**
 * Grupos e itens, na ordem em que são perguntados.
 *
 * Os nomes dos GRUPOS são meus: a lista de origem só marcava a divisão com o
 * botão "definir como Não para todas". Renomear é editar o `titulo` aqui.
 */
export const GRUPOS = [
  {
    id: 'cardiaca',
    titulo: 'Doenças cardíacas',
    itens: [
      { id: 'hipertensao', rotulo: 'Hipertensão' },
      { id: 'icc', rotulo: 'Insuficiência cardíaca congestiva' },
      { id: 'parada_cardiaca', rotulo: 'Eventos de parada cardíaca' },
      { id: 'fibrilacao_atrial', rotulo: 'Fibrilação atrial' },
      { id: 'outras_arritmias', rotulo: 'Outras arritmias' },
      { id: 'pericardite', rotulo: 'Pericardite' },
      { id: 'valvulas', rotulo: 'Doença das válvulas cardíacas' },
      { id: 'outras_cardiacas', rotulo: 'Outras doenças cardíacas' },
    ],
  },
  {
    id: 'vascular',
    titulo: 'Doença vascular e cerebrovascular',
    itens: [
      { id: 'angina', rotulo: 'Angina' },
      { id: 'iam', rotulo: 'Infarto agudo do miocárdio' },
      { id: 'ait', rotulo: 'Acidente isquêmico transitório' },
      { id: 'avc', rotulo: 'Acidente vascular cerebral' },
      { id: 'outra_cerebrovascular', rotulo: 'Outra doença cerebrovascular' },
      { id: 'mesenterica', rotulo: 'Insuficiência arterial mesentérica' },
      { id: 'carotida', rotulo: 'Doença obstrutiva da carótida' },
      { id: 'aneurisma_aorta', rotulo: 'Aneurisma da aorta abdominal ≥ 6 cm' },
      { id: 'aorta_oclusiva', rotulo: 'Doença oclusiva da aorta' },
      { id: 'arterial_periferica', rotulo: 'Insuficiência arterial periférica' },
    ],
  },
  {
    id: 'procedimentos',
    titulo: 'Procedimentos cardiovasculares prévios',
    itens: [
      { id: 'revascularizacao', rotulo: 'Cirurgia de revascularização do miocárdio' },
      { id: 'angioplastia_coronaria', rotulo: 'Angioplastia coronária' },
      { id: 'marcapasso', rotulo: 'Marcapasso definitivo' },
      { id: 'cdi', rotulo: 'Cardioversor desfibrilador implantável (CDI)' },
      { id: 'angioplastia_vascular', rotulo: 'Angioplastia ou enxerto vascular (não coronariana)' },
      { id: 'troca_valva', rotulo: 'Substituição de válvula' },
      { id: 'aterectomia', rotulo: 'Aterectomia carotídea' },
      { id: 'paratireoidectomia', rotulo: 'Paratireoidectomia (PTx)' },
    ],
  },
  {
    id: 'diabetes',
    titulo: 'Diabetes e complicações',
    itens: [
      { id: 'diabetes', rotulo: 'Diabetes' },
      { id: 'nefropatia', rotulo: 'Nefropatia diabética' },
      { id: 'retinopatia', rotulo: 'Retinopatia diabética' },
      { id: 'catarata', rotulo: 'Catarata diabética' },
      { id: 'glaucoma', rotulo: 'Glaucoma diabético' },
      { id: 'neuropatia', rotulo: 'Neuropatia diabética' },
      { id: 'pe_diabetico', rotulo: 'Pé diabético' },
      { id: 'gastroparesia', rotulo: 'Gastroparesia diabética' },
      { id: 'outras_diabeticas', rotulo: 'Outras complicações diabéticas' },
    ],
  },
  {
    id: 'pulmonar',
    titulo: 'Doença pulmonar crônica',
    itens: [
      { id: 'dpoc', rotulo: 'Doença pulmonar obstrutiva crônica' },
      { id: 'asma', rotulo: 'Asma' },
      { id: 'apneia', rotulo: 'Apneia obstrutiva do sono' },
      { id: 'outra_pulmonar', rotulo: 'Outra doença pulmonar crônica' },
    ],
  },
  {
    id: 'digestiva',
    titulo: 'Doença gastrointestinal e hepática',
    itens: [
      { id: 'ulcera', rotulo: 'Úlcera péptica' },
      { id: 'hepatica', rotulo: 'Doença hepática crônica' },
      { id: 'hepatite_b', rotulo: 'Hepatite crônica B' },
      { id: 'hepatite_c', rotulo: 'Hepatite crônica C' },
      { id: 'outra_gastrointestinal', rotulo: 'Outra doença gastrointestinal' },
    ],
  },
  {
    id: 'hematologica',
    titulo: 'Neoplasias hematológicas',
    itens: [
      { id: 'leucemia', rotulo: 'Leucemia (aguda ou crônica)' },
      { id: 'linfoma', rotulo: 'Linfoma' },
      { id: 'mieloma', rotulo: 'Mieloma múltiplo' },
      { id: 'outras_hematologicas', rotulo: 'Outras neoplasias hematológicas' },
    ],
  },
  {
    id: 'neoplasia_solida',
    titulo: 'Neoplasia sólida, por localização',
    itens: [
      { id: 'neo_mama', rotulo: 'Mama' },
      { id: 'neo_cerebral', rotulo: 'Cerebral' },
      { id: 'neo_endocrina', rotulo: 'Endócrina' },
      { id: 'neo_gastrointestinal', rotulo: 'Gastrointestinal' },
      { id: 'neo_pulmao', rotulo: 'Pulmão' },
      { id: 'neo_musculoesqueletica', rotulo: 'Musculoesquelética' },
      { id: 'neo_geniturinario', rotulo: 'Geniturinário' },
      { id: 'neo_pele', rotulo: 'Pele' },
      { id: 'neo_outros', rotulo: 'Outros' },
    ],
  },
  {
    id: 'neuro',
    titulo: 'Doenças neurológicas e psiquiátricas',
    itens: [
      { id: 'epilepsia', rotulo: 'Epilepsia' },
      { id: 'esclerose_multipla', rotulo: 'Esclerose múltipla' },
      { id: 'parkinson', rotulo: 'Doença de Parkinson' },
      { id: 'polineuropatia', rotulo: 'Polineuropatia (exceto diabética) e outras doenças do sistema nervoso periférico' },
      { id: 'demencia', rotulo: 'Doença de Alzheimer e outros tipos de demência' },
      { id: 'depressao', rotulo: 'Depressão' },
      { id: 'alcool', rotulo: 'Dependência do álcool' },
      { id: 'outras_mentais', rotulo: 'Outras doenças mentais e do comportamento' },
      { id: 'outra_neurologica', rotulo: 'Outra doença neurológica' },
    ],
  },
  {
    id: 'endocrina',
    titulo: 'Doenças endócrinas',
    itens: [
      { id: 'hipertireoidismo', rotulo: 'Hipertireoidismo' },
      { id: 'hipotireoidismo', rotulo: 'Hipotireoidismo' },
      { id: 'outras_endocrinas', rotulo: 'Outras doenças endócrinas' },
    ],
  },
  {
    id: 'infecciosa',
    titulo: 'Infecciosas e outras',
    itens: [
      { id: 'hiv', rotulo: 'HIV positivo' },
      { id: 'aids', rotulo: 'AIDS (incluindo HIV positivo)' },
      { id: 'tecido_conjuntivo', rotulo: 'Doenças do tecido conjuntivo' },
      { id: 'tuberculose', rotulo: 'História de tuberculose' },
    ],
  },
];

/** Todos os itens, achatados — útil para contagens e para validar ids. */
export const TODOS_OS_ITENS = GRUPOS.flatMap((g) =>
  g.itens.map((i) => ({ ...i, grupoId: g.id, grupoTitulo: g.titulo })),
);

/**
 * Data em precisão variável.
 *
 * O paciente lembra que infartou "em 2019" mas não o dia — exigir data
 * completa faria o profissional inventar um dia ou deixar o campo vazio, e as
 * duas saídas são piores do que registrar só o ano.
 */
export function formatarData(data) {
  if (!data || !data.valor) return '';
  if (data.precisao === 'ano') return data.valor;
  const [ano, mes, dia] = data.valor.split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : data.valor;
}

/** Um resumo curto do que foi marcado, para a lista de pacientes. */
export function resumir(respostas) {
  const v = Object.values(respostas || {});
  return {
    sim: v.filter((r) => r && r.resposta === 'sim').length,
    nao: v.filter((r) => r && r.resposta === 'nao').length,
    naoAvaliado: v.filter((r) => r && r.resposta === 'nao_avaliado').length,
    respondidas: v.filter((r) => r && r.resposta).length,
    total: TODOS_OS_ITENS.length,
  };
}

/**
 * Texto do resumo, pronto para colar no prontuário.
 *
 * Só o que é POSITIVO entra nomeado — é o que muda a conduta. O que ficou sem
 * avaliar vira uma contagem no fim: some da lista, mas não some do documento,
 * porque "não perguntei" e "não tem" são coisas diferentes e confundir as
 * duas é o pior desfecho possível aqui.
 */
export function gerarResumo(registro) {
  const respostas = registro.respostas || {};
  const turno = rotuloDoTurno(registro);
  const linhas = [`Paciente: ${registro.nome || '—'}${turno ? ` — ${turno}` : ''}`, ''];

  const positivas = [];
  const naoAvaliadas = [];

  TODOS_OS_ITENS.forEach((item) => {
    const r = respostas[item.id];
    if (r && r.resposta === 'sim') {
      const quando = formatarData(r.data);
      positivas.push(`${item.rotulo}${quando ? ` (data: ${quando})` : ' (sem data informada)'}`);
    } else if (!r || !r.resposta || r.resposta === 'nao_avaliado') {
      naoAvaliadas.push(item.rotulo);
    }
  });

  linhas.push('Comorbidades identificadas:');
  if (positivas.length) positivas.forEach((t) => linhas.push(`- ${t}`));
  else linhas.push('- Nenhuma comorbidade positiva registrada.');

  if (naoAvaliadas.length) {
    linhas.push('', `Itens não avaliados: ${naoAvaliadas.length}`);
  }

  return linhas.join('\n');
}

/** Nome do arquivo de backup, com a data no formato ISO para ordenar sozinho. */
export function nomeDoBackup() {
  return `comorbidades-${new Date().toISOString().slice(0, 10)}.json`;
}

/**
 * Turno e escala de dias.
 *
 * Vinham escritos dentro do nome do paciente ("1º SQS"), o que impede
 * filtrar: o app só via texto. Como campos próprios, viram seleção na ficha e
 * filtro na lista.
 *
 * SQS e TQS são as escalas de dias da clínica — segunda/quarta/sexta e
 * terça/quinta/sábado. Se a sua clínica usar outras siglas, é editar aqui.
 */
export const TURNOS = [
  { valor: '1', rotulo: '1º' },
  { valor: '2', rotulo: '2º' },
  { valor: '3', rotulo: '3º' },
];

export const ESCALAS = [
  { valor: 'SQS', rotulo: 'SQS', descricao: 'Segunda, quarta e sexta' },
  { valor: 'TQS', rotulo: 'TQS', descricao: 'Terça, quinta e sábado' },
];

/** "1º SQS" — como você já escrevia, agora montado a partir dos campos. */
export function rotuloDoTurno(registro) {
  if (!registro || (!registro.turno && !registro.escala)) return '';
  const t = registro.turno ? `${registro.turno}º` : '';
  return [t, registro.escala].filter(Boolean).join(' ');
}

/**
 * As combinações turno + escala que REALMENTE existem nos registros.
 *
 * O filtro é montado a partir daqui, e não das seis combinações possíveis:
 * oferecer um turno vazio para tocar é ruído.
 */
export function turnosPresentes(registros) {
  const vistos = new Map();
  (registros || []).forEach((r) => {
    const chave = `${r.turno || ''}|${r.escala || ''}`;
    if (chave === '|') return;
    if (!vistos.has(chave)) vistos.set(chave, { turno: r.turno || '', escala: r.escala || '', rotulo: rotuloDoTurno(r) });
  });
  return [...vistos.values()].sort((a, b) =>
    (a.escala + a.turno).localeCompare(b.escala + b.turno),
  );
}
