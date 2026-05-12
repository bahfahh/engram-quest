// ESLint config for EngramQuest — uses eslint-plugin-obsidianmd (Obsidian official guidelines).
import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

// Extract only obsidianmd/* rules from recommended config
const recommended = obsidianmd.configs.recommended;
const jsonRecommended = recommended.find((config) =>
  Array.isArray(config.files) &&
  config.files.includes("package.json") &&
  config.language === "json/json"
);
const disabledRecommendedRules = Object.fromEntries(
  recommended.flatMap((config) => Object.keys(config.rules || {})).map((rule) => [rule, "off"])
);

export default [
  ...recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        sourceType: "module",
      },
      globals: {
        require: "readonly",
        module: "writable",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      // Disable general TS/JS rules that produce false positives on plain CJS modules
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-deprecated": "off",
      "no-undef": "off",
      "no-empty": "off",
    },
  },
  {
    files: ["manifest.json"],
    language: "json/json",
    plugins: jsonRecommended.plugins,
    rules: {
      ...disabledRecommendedRules,
      "no-irregular-whitespace": "off",
      "obsidianmd/validate-manifest": "error",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "main.js",          // built output — minified, not source
      "tests/**",
      "scripts/**",
      "bundled-skills/**",
    ],
  },
];
