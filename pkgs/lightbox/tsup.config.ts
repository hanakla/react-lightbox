import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.tsx"],
	format: ["cjs", "esm"],
	dts: true,
	outDir: "dist",
	external: ["react", "react-dom", "focus-trap-react", "@use-gesture/react"],
	splitting: false,
	sourcemap: true,
	clean: true,
});
