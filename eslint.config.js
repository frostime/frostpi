import js from "@eslint/js";
import globals from "globals";
import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";

const typedTypeScript = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ["**/*.ts", "**/*.tsx", "**/*.svelte.ts"],
}));

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/artifacts/**", "**/*.d.ts"] },
  js.configs.recommended,
  ...typedTypeScript,
  ...svelte.configs["flat/recommended"],
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.svelte.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".svelte"],
      },
      globals: { ...globals.browser },
    },
    rules: {
      "svelte/no-at-html-tags": "off",
      "svelte/prefer-svelte-reactivity": "off",
      "no-unused-vars": "off",
    },
  },
);
