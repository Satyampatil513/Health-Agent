import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // v0 is local-storage-only (no backend yet). Every page hydrates its
      // client state from localStorage once on mount via useEffect, since
      // localStorage isn't available during SSR — the standard pattern this
      // rule is meant to steer people away from doesn't apply here (there's
      // no external store subscription, just a one-time read on mount).
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
