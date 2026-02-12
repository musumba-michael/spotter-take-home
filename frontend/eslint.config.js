// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
    [
        { ignores: ["dist"] },
        {
            files: ["**/*.{ts,tsx}"],
            extends: [
                js.configs.recommended,
                ...tseslint.configs.recommended,
                prettier, // Disables ESLint rules that conflict with Prettier
            ],
            languageOptions: {
                ecmaVersion: 2020,
                globals: globals.browser,
            },
            plugins: {
                "react-hooks": reactHooks,
                "react-refresh": reactRefresh,
            },
            rules: {
                ...reactHooks.configs.recommended.rules,
                "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
                // Remove indent rule since Prettier will handle formatting
            },
        },
    ],
    storybook.configs["flat/recommended"]
);
