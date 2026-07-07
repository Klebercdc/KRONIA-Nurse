import { montarContexto } from '../kronos-context';

describe('montarContexto', () => {
  test('monta o contexto a partir do usuário e da pergunta', () => {
    const contexto = montarContexto({ id: 'u1', nome: 'Ana' }, 'Como puncionar uma fístula?');

    expect(contexto).toEqual({
      usuario: { id: 'u1', nome: 'Ana' },
      pergunta: 'Como puncionar uma fístula?',
    });
  });

  test('remove espaços nas bordas da pergunta', () => {
    const contexto = montarContexto({ id: 'u1', nome: 'Ana' }, '  qual a dose máxima?  ');

    expect(contexto.pergunta).toBe('qual a dose máxima?');
  });

  test('não inclui nenhum campo além de usuário e pergunta (sem histórico/especialidade)', () => {
    const contexto = montarContexto({ id: 'u1', nome: 'Ana' }, 'teste');

    expect(Object.keys(contexto).sort()).toEqual(['pergunta', 'usuario']);
  });
});
