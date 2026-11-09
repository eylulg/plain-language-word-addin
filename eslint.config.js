import js from "@eslint/js";
import { flatConfigs as importX } from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      // Vendored Untitled UI components keep their upstream style.
      "addin/src/components/base/**",
      "addin/src/components/foundations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    plugins: { "import-x": importX.recommended.plugins["import-x"] },
    rules: {
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import-x/no-duplicates": "error",
      "no-console": "error",
      "no-void": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["addin/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, Office: "readonly", Word: "readonly" },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
    },
  },
  {
    files: ["server/**/*.ts", "*.js", "*.mjs", "addin/*.ts", "**/scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
);
