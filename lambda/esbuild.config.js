const esbuild = require("esbuild");
const packageJson = require("./package.json");

esbuild.build({
    entryPoints: ['./index.ts'],
    bundle: true,
    platform: 'node',
    outfile: 'index.mjs',
    format: "esm",
    target: 'node18',
    external: [
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
    ],
    logLevel: "info",
});