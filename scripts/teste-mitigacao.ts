/**
 * Script TEMPORÁRIO de validação da mitigação anti-fabricação (2026-07-02).
 * Deletar após a validação passar — não faz parte do produto.
 *
 * Rodar com a chave no ambiente:
 *   GROQ_API_KEY=... npx tsx scripts/teste-mitigacao.ts
 *
 * Caso 1 (não pode fabricar): input só com temperatura — a seção Diagnóstico
 * deve sair "Sem registro para esta seção neste turno", a temperatura deve
 * sair "38,7" e as 4 seções devem estar presentes. Roda 3x (temperatura 0.2
 * não é determinística).
 * Caso 2 (deve estruturar o ditado): input com "diagnóstico de hipertermia"
 * ditado em palavras — a seção deve ser preenchida citando o ditado.
 */
import { chamarGroq } from '../lib/groq-client';
import { promptDocumento } from '../lib/prompts';

const SECOES = [
  'Histórico/Coleta de Dados',
  'Diagnóstico de Enfermagem',
  'Planejamento/Implementação',
  'Avaliação',
];

const INPUT_SEM_DIAGNOSTICO = 'Leito: Leito 7\n[06:23] (Nota) temperatura 38,7';
const INPUT_COM_DIAGNOSTICO =
  'Leito: Leito 7\n[06:23] (Nota) temperatura 38,7, diagnóstico de hipertermia';

function extrairSecaoDiagnostico(doc: string): string {
  const inicio = doc.indexOf('Diagnóstico de Enfermagem');
  if (inicio === -1) return '(seção ausente)';
  const aposTitulo = doc.slice(inicio + 'Diagnóstico de Enfermagem'.length);
  const fim = aposTitulo.indexOf('Planejamento/Implementação');
  return (fim === -1 ? aposTitulo : aposTitulo.slice(0, fim)).trim();
}

function avaliarCaso1(doc: string): string[] {
  const falhas: string[] = [];
  const secaoDiag = extrairSecaoDiagnostico(doc);
  if (secaoDiag !== 'Sem registro para esta seção neste turno') {
    falhas.push(`(a) FALHOU — seção Diagnóstico: "${secaoDiag}"`);
  }
  if (!doc.includes('38,7')) falhas.push('(b) FALHOU — temperatura não grafada "38,7"');
  if (doc.includes('38.7')) falhas.push('(b) FALHOU — encontrado "38.7" com ponto');
  for (const s of SECOES) {
    if (!doc.includes(s)) falhas.push(`(c) FALHOU — seção ausente: "${s}"`);
  }
  return falhas;
}

async function main() {
  const prompt = promptDocumento('evolucao');
  let algumaFalha = false;

  console.log('════ CASO 1 — sem diagnóstico ditado (3 execuções) ════');
  for (let i = 1; i <= 3; i++) {
    const doc = await chamarGroq(prompt, INPUT_SEM_DIAGNOSTICO, { json: false });
    console.log(`\n──── Execução ${i} ────\n${doc}\n`);
    const falhas = avaliarCaso1(doc);
    if (falhas.length === 0) {
      console.log(`Execução ${i}: APROVADA — (a), (b), (c) atendidos.`);
    } else {
      algumaFalha = true;
      console.log(`Execução ${i}: REPROVADA:\n  ${falhas.join('\n  ')}`);
    }
  }

  console.log('\n════ CASO 2 — diagnóstico ditado explicitamente ════');
  const doc2 = await chamarGroq(prompt, INPUT_COM_DIAGNOSTICO, { json: false });
  console.log(`\n${doc2}\n`);
  const secaoDiag2 = extrairSecaoDiagnostico(doc2);
  const preenchida =
    secaoDiag2 !== 'Sem registro para esta seção neste turno' &&
    /hipertermia/i.test(secaoDiag2);
  if (preenchida) {
    console.log('Caso 2: APROVADO — seção preenchida citando o diagnóstico ditado.');
  } else {
    algumaFalha = true;
    console.log(`Caso 2: REPROVADO — seção Diagnóstico: "${secaoDiag2}"`);
  }

  process.exit(algumaFalha ? 1 : 0);
}

main().catch((e) => {
  console.error('Erro ao executar validação:', e);
  process.exit(1);
});
