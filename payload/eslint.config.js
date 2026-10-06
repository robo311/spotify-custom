// Lint config: typescript-eslint (type-aware) + hooks rules (Preact hooks follow React's rules).
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'smart'],
      // `x => doSomething(x)` callbacks stay readable; braces add noise without catching bugs.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // `void | (() => void)` is the idiomatic "optional cleanup" return type (same as useEffect).
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { ...tseslint.configs.disableTypeChecked.languageOptions, globals: globals.node },
    rules: { ...tseslint.configs.disableTypeChecked.rules, 'no-console': 'off' },
  },
)
