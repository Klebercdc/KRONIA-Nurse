/**
 * Testes unitários para lib/leito-parser.ts — detecção local de "leito X".
 * Cobre a normalização de número por extenso ("leito sete" → "Leito 7"),
 * a tolerância ao erro de ditado "eleito" e o token não numérico literal.
 */
import { detectarLeito } from '../leito-parser';

describe('detectarLeito', () => {
  test('"leito 7" com algarismo', () => {
    const r = detectarLeito('leito 7 temperatura 38,7');
    expect(r).not.toBeNull();
    expect(r!.leito).toBe('Leito 7');
    expect(r!.resto).toBe('temperatura 38,7');
  });

  test('"leito sete" por extenso vira "Leito 7"', () => {
    const r = detectarLeito('leito sete temperatura 38,7');
    expect(r).not.toBeNull();
    expect(r!.leito).toBe('Leito 7');
    expect(r!.resto).toBe('temperatura 38,7');
  });

  test('"Leito SETE" — caixa alta também normaliza', () => {
    const r = detectarLeito('Leito SETE paciente estável');
    expect(r).not.toBeNull();
    expect(r!.leito).toBe('Leito 7');
  });

  test('"eleito 7" — erro de ditado do iOS ainda é detectado', () => {
    const r = detectarLeito('eleito 7 paciente estável');
    expect(r).not.toBeNull();
    expect(r!.leito).toBe('Leito 7');
    expect(r!.resto).toBe('paciente estável');
  });

  test('"eleito sete" — erro de ditado + por extenso', () => {
    const r = detectarLeito('eleito sete paciente estável');
    expect(r).not.toBeNull();
    expect(r!.leito).toBe('Leito 7');
  });

  test.each([
    ['três', 3], ['tres', 3], ['uma', 1], ['quatorze', 14], ['vinte', 20], ['cinquenta', 50],
  ])('"leito %s" → "Leito %i"', (extenso, numero) => {
    const r = detectarLeito(`leito ${extenso} sem intercorrências`);
    expect(r).not.toBeNull();
    expect(r!.leito).toBe(`Leito ${numero}`);
  });

  test('token não numérico e fora do mapa fica literal', () => {
    const r = detectarLeito('leito 5B paciente em jejum');
    expect(r).not.toBeNull();
    expect(r!.leito).toBe('Leito 5B');
  });

  test('palavra fora do mapa fica literal', () => {
    const r = detectarLeito('leito isolamento paciente em jejum');
    expect(r).not.toBeNull();
    expect(r!.leito).toBe('Leito isolamento');
  });

  test('texto sem leito retorna null', () => {
    expect(detectarLeito('temperatura 38,7 paciente estável')).toBeNull();
  });

  test('sem detalhes além do leito preenche resto padrão', () => {
    const r = detectarLeito('leito sete');
    expect(r).not.toBeNull();
    expect(r!.resto).toBe('(sem detalhes adicionais)');
  });
});
