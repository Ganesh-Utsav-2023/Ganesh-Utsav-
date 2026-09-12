import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Detect the environment port dynamically (defaulting to 3000 for internal proxying/local dev)
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';

  // Detect whether running in Google AI Studio preview environment or behind an HTTPS proxy
  const isPreview = Boolean(
    process.env.APP_URL?.startsWith('https') ||
    process.env.K_SERVICE ||
    process.env.APPLET_ID
  );

  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-icons': ['lucide-react'],
            'vendor-charts': ['recharts'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      hmr: isHmrDisabled
        ? false
        : {
            protocol: isPreview ? 'wss' : 'ws',
            // In Google AI Studio preview, client connects via WSS on standard port 443 through the reverse proxy.
            // Avoid hardcoding clientPort to internal ports (e.g., 3000) which are not accessible externally.
            clientPort: process.env.HMR_PORT
              ? parseInt(process.env.HMR_PORT, 10)
              : (isPreview ? 443 : (port === 8080 ? 3000 : port)),
          },
      watch: isHmrDisabled ? null : {},
    },
  };
});
