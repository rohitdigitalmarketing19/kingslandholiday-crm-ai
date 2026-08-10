
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Casting process to any to resolve missing 'cwd' property on the type definition in certain environments.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: `http://localhost:${env.PORT || 5000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
