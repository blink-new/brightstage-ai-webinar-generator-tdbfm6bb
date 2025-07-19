import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { createRequire } from 'module'

// --- Lucide Icon Import Checker ---
let lucideIcons = []
let lucideIconsLoaded = false

function loadLucideIcons() {
  if (lucideIconsLoaded) return
  
  try {
    const require = createRequire(import.meta.url)
    const lucideReact = require("lucide-react")
    lucideIcons = Object.keys(lucideReact)
    lucideIconsLoaded = true
  } catch (error) {
    console.warn('ESLint: lucide-react not found, skipping icon validation')
    lucideIcons = []
    lucideIconsLoaded = true
  }
}

function suggestClosestIcon(name) {
  if (!lucideIconsLoaded) loadLucideIcons()
  if (lucideIcons.length === 0) return ""
  
  const threshold = 3
  const distance = (a, b) => {
    const dp = Array(a.length + 1)
      .fill(null)
      .map(() => Array(b.length + 1).fill(0))
    for (let i = 0; i <= a.length; i++) dp[i][0] = i
    for (let j = 0; j <= b.length; j++) dp[0][j] = j
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
    return dp[a.length][b.length]
  }
  
  const scored = lucideIcons
    .map((icon) => ({ icon, score: distance(name.toLowerCase(), icon.toLowerCase()) }))
    .filter((r) => r.score <= threshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((r) => r.icon)
  return scored.length ? `Did you mean: ${scored.join(", ")}?` : ""
}

export default tseslint.config(
  // Global ignores
  { 
    ignores: [
      'dist', 
      'node_modules', 
      'build', 
      'coverage',
      'public/**/*',
      '*.min.js',
      '*.bundle.js'
    ] 
  },
  
  // Base configuration for TypeScript files
  {
    extends: [
      js.configs.recommended, 
      ...tseslint.configs.recommended
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022
      },
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // === REACT HOOKS RULES (Critical for preventing crashes) ===
      ...reactHooks.configs.recommended.rules,
      
      // === REACT REFRESH RULES ===
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ],
      
      // === TYPESCRIPT RULES (Relaxed for development) ===
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off', // Allow any for rapid development
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow non-null assertions
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Too strict for development
      '@typescript-eslint/prefer-optional-chain': 'off', // Too strict for development
      '@typescript-eslint/no-floating-promises': 'off', // Too strict for development
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'off', // Too strict for development
      '@typescript-eslint/require-await': 'off', // Too strict for development
      
      // === SECURITY RULES (Disabled for development) ===
      // These would be enabled in production
      
      // === ERROR HANDLING RULES ===
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      
      // === PERFORMANCE RULES ===
      'no-console': 'off', // Allow console in development
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-alert': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      
      // === CODE QUALITY RULES (Relaxed) ===
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'off',
      'object-shorthand': 'off',
      'prefer-template': 'off',
      'no-nested-ternary': 'off',
      'no-unneeded-ternary': 'off',
      'no-else-return': 'off',
      'consistent-return': 'off',
      
      // === REACT SPECIFIC RULES ===
      'react-hooks/exhaustive-deps': 'warn',
      
      // === DISABLE OVERLY STRICT RULES FOR DEVELOPMENT ===
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  
  // Configuration for shadcn/ui components
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
    },
  },
  
  // Configuration for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.vitest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  
  // Configuration for configuration files
  {
    files: ['*.config.{js,ts,mjs,cjs}', 'vite.config.ts', 'tailwind.config.cjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
  
  // Lucide icon validation (prevents empty pages)
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      lucide: {
        rules: {
          "no-invalid-icon-import": {
            create(context) {
              return {
                ImportDeclaration(node) {
                  if (node.source.value !== "lucide-react") return
                  
                  if (!lucideIconsLoaded) loadLucideIcons()
                  if (lucideIcons.length === 0) return
                  
                  for (const specifier of node.specifiers) {
                    if (specifier.type === 'ImportSpecifier') {
                      const name = specifier.imported?.name
                      if (name && !lucideIcons.includes(name)) {
                        context.report({
                          node: specifier,
                          message: `'${name}' is not a valid lucide-react icon. ${suggestClosestIcon(name)}`,
                        })
                      }
                    }
                  }
                },
              }
            },
          },
        },
      },
    },
    rules: {
      "lucide/no-invalid-icon-import": "error",
    },
  }
)