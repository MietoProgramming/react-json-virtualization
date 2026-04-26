import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const sharedLanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },
  globals: {
    ...globals.browser,
    ...globals.node
  }
};

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "demo/dist/**",
      "node_modules/**",
      "bench/fixtures/generated/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    languageOptions: sharedLanguageOptions,
    settings: {
      react: {
        version: "detect"
      }
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "no-useless-escape": "warn",
      "prefer-const": "warn"
    }
  },
  {
    files: ["tests/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest
      }
    }
  },
  eslintConfigPrettier
);
