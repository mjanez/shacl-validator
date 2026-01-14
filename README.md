# SHACL Validator & Report Viewer

Web application for validating RDF catalogs against SHACL shapes and analyzing validation reports. Supports DCAT-AP, DCAT-AP-ES, and NTI-RISP profiles.

## Features

- **Dual mode operation**: validate RDF catalogs or analyze existing [SHACL reports](https://www.w3.org/TR/shacl/) (Turtle format)
- **Multiple input methods**: file upload, URL loading, or direct text input
- **Profile support**: [DCAT-AP](https://semiceu.github.io/DCAT-AP/), [DCAT-AP-ES](https://datosgobes.github.io/DCAT-AP-ES/), [NTI-RISP](https://datosgobes.github.io/NTI-RISP/)
- **Branch selection**: validate against stable or development shape versions
- **Comprehensive reporting**: grouped violations with severity levels and detailed messages
- **RDF statistics**: triples count, namespaces, and entity breakdown
- **Monaco editor**: syntax highlighting for RDF formats
- **Multilingual**: English and Spanish translations

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Application available at `http://localhost:5173`

## Build

```bash
npm run build
```

Static files generated in `build/` directory.

## Deployment

Configured for GitHub Pages deployment:

```bash
npm run deploy
```

## Technology Stack

- React 19 with TypeScript
- Vite build system
- SHACL validation via shacl-engine
- RDF parsing with N3.js
- Monaco Editor for syntax highlighting
- Radix UI primitives
- Tailwind CSS

## Project Structure

```
src/
├── components/
│   ├── Validator/     # RDF validation interface
│   ├── Viewer/        # Report analysis interface
│   ├── Guide/         # User documentation
│   └── layout/        # App shell components
├── services/
│   ├── SHACLValidationService.ts
│   ├── RDFService.ts
│   └── DataDiscoveryService.ts
└── config/
    └── mqa-config.json  # Profile definitions
```

## License

MIT
