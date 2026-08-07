import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['build/**', 'dist/**', 'coverage/**', 'node_modules/**'] },

  // Browser-side game code.
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // react-three-fiber is built on mutating live Three.js objects: refs are
      // handed to children so `useFrame` can write transforms without causing a
      // React render, and Vector3/Object3D are updated in place every frame.
      // These three rules assume an immutable render model and fire constantly
      // on correct R3F code.
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',

      // Context modules deliberately export a Provider plus its hook.
      'react-refresh/only-export-components': 'off',

      // Initialising a variable before an exhaustive if/else chain overwrites
      // it is intentional here — it keeps a future branch from reading undefined.
      'no-useless-assignment': 'off',

      // `_`-prefixed names are the escape hatch for deliberate throwaways.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Tests get the vitest globals.
  {
    files: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'src/test/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Node-side tooling: dev launchers, LAN relay, Electron shell (CommonJS).
  {
    files: ['scripts/**/*.js', 'electron/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Build/lint config files are ESM regardless of the CommonJS package type.
  // vite.config.mts needs the TS parser, hence typescript-eslint here too.
  {
    files: ['*.config.mjs', 'vite.config.mts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  }
);
