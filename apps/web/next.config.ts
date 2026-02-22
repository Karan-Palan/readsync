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

if (existsSync(foliateJs)) {
	execSync(`rm -rf "${dest}" && cp -r "${foliateJs}/." "${dest}"`, {
		stdio: "ignore",
	});
}

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	turbopack: {},
};

export default nextConfig;
