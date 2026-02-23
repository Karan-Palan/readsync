import "@readsync/env/web";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Copy foliate-js library files to public/ so they can be served as native ES modules.
// This avoids bundler issues with its dynamic PDF.js imports.
const foliateJs = path.resolve(
	__dirname,
	"../../node_modules/@xincmm/foliate-js",
);
const dest = path.resolve(__dirname, "public/foliate-js");

// Sync foliate-js from the npm package only when the public/ copy doesn't
// already exist (e.g. first-time local setup without git-tracked files).
// On Vercel/CI the files are always present from the git checkout, so this
// block is skipped and the committed public/foliate-js is used directly.
if (existsSync(foliateJs) && !existsSync(dest)) {
	try {
		execSync(`cp -r "${foliateJs}/." "${dest}"`, { stdio: "pipe" });
	} catch {
		// Ignore — fall back to pre-committed public/foliate-js files.
	}
}

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	turbopack: {},
};

export default nextConfig;
