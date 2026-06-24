import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "mfe_auth",
      filename: "remoteEntry.js",
      // Componentes expostos para o Shell consumir
      exposes: {
        './ConsultaPecas': './src/pages/ConsultaPecas.tsx'
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: {
    target: "esnext",
    minify: false,
  },
  server: {
    port: 3002,
    strictPort: true,
    host: true,
    cors: true
  },
  preview: {
    port: 4001,
    host: true,
  },
});
