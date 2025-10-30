import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [react()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        },
        
        // --- INÍCIO DA CORREÇÃO CRÍTICA DO BUILD ---
        // Adiciona a configuração para resolver o erro 'pdfjs-dist' no Rollup
        build: {
            rollupOptions: {
                external: [
                    'pdfjs-dist/build/pdf.worker.js'
                ]
            }
        }
        // --- FIM DA CORREÇÃO CRÍTICA DO BUILD ---
    };
});
