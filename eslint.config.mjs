import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Load the base Next.js configurations first
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("next/typescript"),

  // --- Add your overriding configuration object AFTER the extends ---
  {
      // Specify which files this override applies to
      files: ["**/*.ts", "**/*.tsx"],

      // Define the rules overrides
      rules: {
          // It's good practice to explicitly disable the base rule here too
          "no-unused-vars": "off",

          // Override the @typescript-eslint/no-unused-vars rule
          "@typescript-eslint/no-unused-vars": [
              "error", // Keep level as "error" to match Vercel build failure
              {
                  // --- Configure options ---
                  "argsIgnorePattern": "^_", // <<< Tell rule to ignore args starting with _
                  "varsIgnorePattern": "^_", // Optional: Ignore local variables starting with _ too
                  "ignoreRestSiblings": true, // Common useful option
                  // You usually don't need to specify "args": "all" or "after-used"
                  // unless you want to deviate from the default or the inherited setting.
              }
          ],

          // You could add other custom rule overrides here if needed
          // "some-other-rule": "warn",
      }
      // You typically don't need to redefine languageOptions or plugins here
      // unless the base config doesn't provide them or you need to change them fundamentally.
      // The rules override should merge correctly.
  }
];

export default eslintConfig;
