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
  },
  testMatch: ['**/lib/__tests__/**/*.test.ts'],
};
