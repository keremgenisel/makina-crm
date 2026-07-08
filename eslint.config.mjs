// ESLint flat config — hedef: gerçek hataları (tanımsız değişken, kullanılmayan import,
// hook kuralı ihlali) yakalamak. Stil dayatmaz; mevcut kod tabanını kırmayacak
// asgari kural seti. Çalıştırma: npm run lint
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**", "release/**", "node_modules/**"] },

  // Renderer (React)
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
    rules: {
      ...js.configs.recommended.rules,
      "react/jsx-uses-vars": "error", // JSX'te kullanılan bileşenler "unused" sayılmasın
      "react-hooks/rules-of-hooks": "error",
      // Mevcut kod bilinçli bağımlılık dışlamaları kullanıyor (eslint-disable yorumlarıyla) —
      // uyarı seviyesinde kalsın, hata olmasın
      "react-hooks/exhaustive-deps": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  // Electron ana süreç + betikler (CommonJS / Node)
  {
    files: ["electron/**/*.cjs", "scripts/**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  // Testler (vitest, node)
  {
    files: ["tests/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: { ...js.configs.recommended.rules },
  },
];
