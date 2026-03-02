import esbuild from "esbuild";

const isDev = process.argv.includes("--dev");

/** @type {import("esbuild").BuildOptions} */
const options = {
	bundle: true,
	entryPoints: ["src/extension.ts"],
	external: ["vscode"],
	format: "cjs",
	logLevel: "info",
	minify: !isDev,
	outfile: "./out/extension.js",
	platform: "node",
	sourcemap: isDev,
};

if (isDev) {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log("Watching for changes…");
} else {
	await esbuild.build(options);
}
