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
            // Monaco Editor - large but lazy loaded
            if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'monaco';
            // SHACL validation engine - lazy loaded on demand
            if (id.includes('shacl-engine')) return 'shacl';
            // JSON-LD processing - lazy loaded with RDF
            if (id.includes('jsonld')) return 'rdf';
            // RDF parsing libraries - used together
            if (id.includes('n3') || id.includes('@rdfjs') || id.includes('rdfxml-streaming-parser')) return 'rdf';
            // UI
            if (id.includes('@radix-ui')) return 'ui';
            if (id.includes('lucide-react')) return 'icons';
            // Markdown rendering
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('unified') || id.includes('hast') || id.includes('mdast')) return 'markdown';
            // Charts
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600,
    target: 'es2020',
    minify: 'esbuild'
  }
})