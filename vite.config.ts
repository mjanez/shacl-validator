import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'monaco';
            if (id.includes('shacl-engine')) return 'shacl';
            if (id.includes('n3') || id.includes('@rdfjs') || id.includes('rdfxml-streaming-parser')) return 'rdf';
            if (id.includes('recharts') || id.includes('d3')) return 'charts';
            if (id.includes('@radix-ui')) return 'ui';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('unified') || id.includes('hast') || id.includes('mdast')) return 'markdown';
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})