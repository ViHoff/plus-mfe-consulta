import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "consultaApp",
      filename: "remoteEntry.js",
      exposes: {
        './ConsultaPecas': './src/pages/ConsultaPecas.tsx'
      },
      shared: ["react", "react-dom", "@mui/material", "@emotion/react", "@emotion/styled"], 
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
    port: 3002,
    host: true,
  },
});
