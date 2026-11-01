import { execSync } from "node:child_process";
import { defineConfig } from "vite";

// Copy-for-LLM prompts fetch files at the commit the site was built from, so they always name real content.
function revision(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "main";
  }
}

export default defineConfig({
  root: "site",
  // Served from https://alex-red.github.io/dev-catalog/ on GitHub Pages.
  base: "/dev-catalog/",
  define: { __CATALOG_REVISION__: JSON.stringify(revision()) },
  server: {
    host: "127.0.0.1",
    // The page imports ../catalog/index.json and the entry sources from the repo root.
    fs: { allow: [".."] },
  },
  build: { outDir: "../dist/site", emptyOutDir: true },
});
