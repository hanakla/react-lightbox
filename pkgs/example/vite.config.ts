import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	root: "src/",
	plugins: [tailwindcss()],
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	build: {
		outDir: "dist/",
	},
});
