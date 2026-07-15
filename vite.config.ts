import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Vendor: React core + routing
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            // Vendor: Framer Motion (large animation library)
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            // Vendor: Socket.IO client
            if (id.includes('node_modules/socket.io-client') || id.includes('node_modules/engine.io-client')) {
              return 'vendor-socketio';
            }
            // Vendor: Supabase
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
            // Vendor: Form validation
            if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod') || id.includes('node_modules/@hookform')) {
              return 'vendor-forms';
            }
            // App: Meeting room (WebRTC heavy — lazy loaded)
            if (id.includes('src/components/MeetingRoom') || id.includes('src/components/meeting/') || id.includes('src/hooks/useWebRTC') || id.includes('src/hooks/useSocket') || id.includes('src/hooks/useMeetingControls')) {
              return 'chunk-meeting';
            }
            // App: Auth pages
            if (id.includes('src/components/auth/') || id.includes('src/pages/SignIn') || id.includes('src/pages/SignUp') || id.includes('src/pages/ForgotPassword')) {
              return 'chunk-auth';
            }
            // App: AI / Memory feature
            if (id.includes('src/pages/MemoryPage') || id.includes('src/pages/HistoryPage')) {
              return 'chunk-ai';
            }
          },
        },
      },
      // Warn when a single chunk exceeds 600KB (before splitting)
      chunkSizeWarningLimit: 600,
    },
  };
});
