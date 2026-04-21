import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// ---------------------------------------------------------------------------
// MegaBanx v2 — ESLint guardrails for .agents/RULES.md §1.2–§1.4
//
// Any change to the forbidden lists below MUST be reviewed alongside RULES.md.
// ---------------------------------------------------------------------------

const FORBIDDEN_DOM_PROPERTIES = [
  // Imperative DOM APIs on `document`
  { object: 'document', property: 'createElement', message: 'Render through JSX instead of imperative DOM (RULES.md §1.2).' },
  { object: 'document', property: 'createElementNS', message: 'Render through JSX instead of imperative DOM (RULES.md §1.2).' },
  { object: 'document', property: 'write', message: 'document.write is forbidden (RULES.md §1.2).' },
  { object: 'document', property: 'writeln', message: 'document.writeln is forbidden (RULES.md §1.2).' },
  { object: 'document', property: 'getElementById', message: 'Use React refs or Zustand, not document.getElementById (RULES.md §1.2).' },
  { object: 'document', property: 'getElementsByClassName', message: 'Use React refs, not document.getElementsByClassName (RULES.md §1.2).' },
  { object: 'document', property: 'getElementsByTagName', message: 'Use React refs, not document.getElementsByTagName (RULES.md §1.2).' },
  { object: 'document', property: 'querySelector', message: 'Use React refs, not document.querySelector (RULES.md §1.2).' },
  { object: 'document', property: 'querySelectorAll', message: 'Use React refs, not document.querySelectorAll (RULES.md §1.2).' },

  // Imperative HTML injection
  { property: 'innerHTML', message: 'Do not assign innerHTML — render through JSX (RULES.md §1.2).' },
  { property: 'outerHTML', message: 'Do not assign outerHTML — render through JSX (RULES.md §1.2).' },
  { property: 'insertAdjacentHTML', message: 'Do not use insertAdjacentHTML — render through JSX (RULES.md §1.2).' },
]

const FORBIDDEN_SYNTAX = [
  {
    // <script> inside JSX is how patches smuggled code into v1; ban it.
    selector: "JSXOpeningElement[name.name='script']",
    message: '<script> elements are forbidden in JSX (RULES.md §1.4). Vite injects the single module bootstrap in index.html.',
  },
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: 'dangerouslySetInnerHTML is forbidden (RULES.md §1.2). Render structured JSX.',
  },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'alert',
          message: 'Use useDialogStore().showAlert() instead of browser alert().',
        },
        {
          name: 'confirm',
          message: 'Use useDialogStore().showConfirm() instead of browser confirm().',
        },
        {
          name: 'prompt',
          message: 'Use useDialogStore().showPrompt() instead of browser prompt().',
        },
      ],
      'no-restricted-properties': ['error', ...FORBIDDEN_DOM_PROPERTIES],
      'no-restricted-syntax': ['error', ...FORBIDDEN_SYNTAX],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
    },
  },
])
