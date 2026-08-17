module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // ts-jest com CommonJS para compatibilidade com Node — o tsconfig principal usa
  // module: "esnext" / moduleResolution: "bundler" que são incompatíveis com Jest.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        strict: true,
      },
    }],
    // lib/evolucao/grafo-adaptativo.js é JS puro (motor extraído do protótipo
    // sem reescrita). allowJs deixa o ts-jest transformá-lo sem que o arquivo
    // precise ser convertido para TypeScript — converter significaria mexer
    // em lógica já testada.
    '^.+\\.jsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        allowJs: true,
        checkJs: false,
        strict: false,
      },
    }],
  },
  testMatch: ['**/lib/__tests__/**/*.test.ts'],
};
