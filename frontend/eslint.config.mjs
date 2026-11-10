import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}$/]",
          message:
            "Hard-coded colors are banned outside design tokens — use theme colors from globals.css (e.g. text-ice, bg-panel/60).",
        },
        {
          selector: "SwitchStatement",
          message:
            "switch/case is banned in src — extend the data table + registry instead (docs: frontend-rules skill).",
        },
      ],
    },
  },
  {
    files: ["src/app/layout.tsx"],
    rules: {
      "@next/next/no-page-custom-font": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
