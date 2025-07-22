import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "lib/**/*",
      "scripts/**/*",
      "database/**/*",
      "docs/**/*",
      ".next/**/*",
      "node_modules/**/*"
    ]
  },
  {
    rules: {
      // Allow require() imports for Node.js compatibility
      "@typescript-eslint/no-require-imports": "off",
      // Allow unused vars in some cases
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow explicit any types for flexibility
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
