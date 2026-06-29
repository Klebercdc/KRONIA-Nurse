/**
 * Testes unitários para lib/scales.ts — foco em NEWS2.
 * Regra crítica verificada: escore final nunca pode sair de 0–20.
 * Referência: Royal College of Physicians, NEWS2 (2017).
 */
import {
  news2SubScore,
  calcularNews2,
  calcularNews2FromRaw,
} from '../scales';

// ─── news2SubScore: conversão de valores brutos ────────────────────────────

describe('news2SubScore — FR (irpm)', () => {
  test.each([
    [8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3], [30, 3],
  ])('FR=%i → %i pts', (valor, esperado) => {
    expect(news2SubScore('fr', valor)).toBe(esperado);
  });
});

describe('news2SubScore — SpO2 (%)', () => {
  test.each([
    [90, 3], [91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0], [100, 0],
  ])('SpO2=%i → %i pts', (valor, esperado) => {
    expect(news2SubScore('spo2', valor)).toBe(esperado);
  });
});

describe('news2SubScore — Suporte de O2', () => {
  test('ar ambiente (0) → 0 pts', () => expect(news2SubScore('o2', 0)).toBe(0));
  test('O2 suplementar (1) → 2 pts', () => expect(news2SubScore('o2', 1)).toBe(2));
  test('O2 suplementar (5 L/min) → 2 pts', () => expect(news2SubScore('o2', 5)).toBe(2));
});

describe('news2SubScore — PA sistólica (mmHg)', () => {
  test.each([
    [70, 3], [90, 3], [91, 2], [100, 2], [101, 1], [110, 1],
    [111, 0], [150, 0], [219, 0], [220, 3], [250, 3],
  ])('PAS=%i → %i pts', (valor, esperado) => {
    expect(news2SubScore('pas', valor)).toBe(esperado);
  });
});

describe('news2SubScore — FC (bpm)', () => {
  test.each([
    [35, 3], [40, 3], [41, 1], [50, 1], [51, 0], [90, 0],
    [91, 1], [110, 1], [111, 2], [130, 2], [131, 3], [160, 3],
  ])('FC=%i → %i pts', (valor, esperado) => {
    expect(news2SubScore('fc', valor)).toBe(esperado);
  });
});

describe('news2SubScore — Nível de consciência', () => {
  test('AVPU alerta (0) → 0 pts', () => expect(news2SubScore('consc', 0)).toBe(0));
  test('Glasgow 15 (normal) → 0 pts', () => expect(news2SubScore('consc', 15)).toBe(0));
  test('Glasgow 14 (alterado) → 3 pts', () => expect(news2SubScore('consc', 14)).toBe(3));
  test('Glasgow 8 (grave) → 3 pts', () => expect(news2SubScore('consc', 8)).toBe(3));
  test('AVPU não-alerta (3) → 3 pts', () => expect(news2SubScore('consc', 3)).toBe(3));
});

describe('news2SubScore — Temperatura (°C)', () => {
  test.each([
    [34.0, 3], [35.0, 3], [35.1, 1], [36.0, 1], [36.1, 0], [38.0, 0],
    [38.1, 1], [39.0, 1], [39.1, 2], [40.5, 2],
  ])('Temp=%s → %i pts', (valor, esperado) => {
    expect(news2SubScore('temp', valor)).toBe(esperado);
  });
});

// ─── calcularNews2: guarda de intervalo e classificação ────────────────────

describe('calcularNews2 — intervalo obrigatório 0–20', () => {
  test('escore 0 (paciente estável) é aceito', () => {
    expect(() => calcularNews2([0, 0, 0, 0, 0, 0, 0])).not.toThrow();
  });

  test('escore 20 (máximo sub-escore) é aceito', () => {
    // fr=3, spo2=3, o2=2, pas=3, fc=3, consc=3, temp=3
    expect(() => calcularNews2([3, 3, 2, 3, 3, 3, 3])).not.toThrow();
    expect(calcularNews2([3, 3, 2, 3, 3, 3, 3]).total).toBe(20);
  });

  test('lança RangeError quando valores brutos são passados por engano (soma > 20)', () => {
    // Simula bug: fr=22, spo2=94, o2=1, pas=90, fc=110, consc=13, temp=38 → soma 368
    expect(() => calcularNews2([22, 94, 1, 90, 110, 13, 38])).toThrow(RangeError);
  });

  test('lança RangeError para qualquer soma > 20', () => {
    expect(() => calcularNews2([7, 7, 7])).toThrow(RangeError);
  });
});

describe('calcularNews2 — classificação de risco', () => {
  test('Baixo: total 0–4, sem score 3 individual', () => {
    expect(calcularNews2([0, 0, 0, 0, 0, 0, 0]).risco).toBe('Baixo');
    expect(calcularNews2([2, 2, 0, 0, 0, 0, 0]).risco).toBe('Baixo');
  });

  test('Médio: total 5–6', () => {
    expect(calcularNews2([2, 1, 0, 1, 1, 0, 0]).risco).toBe('Médio');
  });

  test('Médio: qualquer score 3 individual (mesmo com total < 5)', () => {
    expect(calcularNews2([3, 0, 0, 0, 0, 0, 0]).risco).toBe('Médio');
  });

  test('Alto: total ≥ 7', () => {
    expect(calcularNews2([3, 2, 2, 0, 0, 0, 0]).risco).toBe('Alto');
    expect(calcularNews2([3, 3, 2, 3, 3, 3, 3]).risco).toBe('Alto');
  });
});

// ─── calcularNews2FromRaw: integração com valores clínicos brutos ───────────

describe('calcularNews2FromRaw — valores brutos como os extraídos pela IA', () => {
  test('RESULTADO SEMPRE DENTRO DE 0–20 com qualquer combinação realista de parâmetros', () => {
    const casos: Partial<Record<'fr' | 'spo2' | 'o2' | 'pas' | 'fc' | 'consc' | 'temp', number>>[] = [
      { fr: 22, spo2: 94, o2: 1, pas: 90, fc: 110, consc: 13, temp: 38.0 },
      { fr: 10, spo2: 97, o2: 0, pas: 130, fc: 75, consc: 15, temp: 37.0 },
      { fr: 30, spo2: 88, o2: 2, pas: 85, fc: 140, consc: 8, temp: 39.5 },
      { fr: 16, spo2: 97, o2: 0, pas: 120, fc: 80, consc: 0, temp: 36.8 },
      { fr: 6, spo2: 91, o2: 5, pas: 88, fc: 38, consc: 12, temp: 34.5 },
    ];
    for (const c of casos) {
      const r = calcularNews2FromRaw(c);
      expect(r.total).toBeGreaterThanOrEqual(0);
      expect(r.total).toBeLessThanOrEqual(20);
    }
  });

  test('caso de deterioração (fr=22, spo2=94, o2=1, pas=90, fc=110, consc=13, temp=38.0) → 12 pts, Alto', () => {
    // fr=2 + spo2=1 + o2=2 + pas=3 + fc=1 + consc=3 + temp=0 = 12
    const resultado = calcularNews2FromRaw({ fr: 22, spo2: 94, o2: 1, pas: 90, fc: 110, consc: 13, temp: 38.0 });
    expect(resultado.total).toBe(12);
    expect(resultado.risco).toBe('Alto');
  });

  test('paciente estável (fr=16, spo2=97, o2=0, pas=120, fc=75, consc=15, temp=37.0) → 0 pts, Baixo', () => {
    const resultado = calcularNews2FromRaw({ fr: 16, spo2: 97, o2: 0, pas: 120, fc: 75, consc: 15, temp: 37.0 });
    expect(resultado.total).toBe(0);
    expect(resultado.risco).toBe('Baixo');
  });

  test('parâmetros parciais (sem o2 e temp) permanecem válidos', () => {
    const resultado = calcularNews2FromRaw({ fr: 20, pas: 115, fc: 85, consc: 15 });
    expect(resultado.total).toBeGreaterThanOrEqual(0);
    expect(resultado.total).toBeLessThanOrEqual(20);
  });
});
