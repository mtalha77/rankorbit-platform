// ESLint config. Primary goal: catch "X is not defined" and unused-import bugs
// at code time, before they ever reach the browser. This is what prevents the
// class of runtime error that a bundler build does not catch.
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  settings: { react: { version: "detect" } },
  plugins: ["react", "react-hooks"],
  extends: ["eslint:recommended", "plugin:react/recommended", "plugin:react-hooks/recommended"],
  rules: {
    // THE important ones for our refactor safety:
    "no-undef": "error",              // "Card is not defined" caught here
    "react/jsx-no-undef": "error",    // "<Card>" used without import caught here
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

    // Relax stylistic rules that would create noise without adding safety:
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    "no-empty": "off",
    "no-cond-assign": "off",
  },
  globals: {
    crypto: "readonly",
    localStorage: "readonly",
    sessionStorage: "readonly",
    fetch: "readonly",
    Blob: "readonly",
    URL: "readonly",
  },
};
