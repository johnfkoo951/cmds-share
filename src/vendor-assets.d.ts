// Text assets inlined by esbuild (see esbuild.config.mjs loader).
declare module '*.txt' { const text: string; export default text; }
declare module '*.css' { const text: string; export default text; }
declare module '*/cmds-pele.version.json' {
	const stamp: { module: string; version: string; pele: string; files: Record<string, string> };
	export default stamp;
}
