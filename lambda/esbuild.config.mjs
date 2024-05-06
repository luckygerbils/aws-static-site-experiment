import esbuild from "esbuild";
import packageJson from "./package.json" with { type: 'json' };

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
});