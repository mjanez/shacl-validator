import { Parser as N3Parser, Store, Writer } from 'n3';
import rdfDataModel from '@rdfjs/data-model';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import { Readable } from 'readable-stream';

type NormalizeOptions = {
  isUrl?: boolean;
  format?: string;
  url?: string;
  contentType?: string | null;
};

/** Handles RDF parsing and serialization (client-side only) */
class RDFService {
  /** Parse RDF content to N3 Store */
  async parseRDF(content: string, format: string = 'text/turtle'): Promise<Store> {
    const normalizedFormat = this.normalizeFormat(format);
    if (normalizedFormat === 'application/rdf+xml') {
      return this.parseRdfXml(content);
    }
    return this.parseWithN3(content, normalizedFormat);
  }

  private normalizeFormat(format?: string): string {
    if (!format) return 'text/turtle';
    const lower = format.toLowerCase();
    if (lower === 'turtle' || lower === 'text/turtle') return 'text/turtle';
    if (lower === 'application/rdf+xml' || lower === 'rdf/xml' || lower === 'rdfxml' || lower === 'application/xml') {
      return 'application/rdf+xml';
    }
    if (lower === 'application/ld+json' || lower === 'jsonld' || lower === 'application/json') {
      return 'application/ld+json';
    }
    if (lower === 'application/n-triples' || lower === 'application/ntriples' || lower === 'n-triples') {
      return 'application/n-triples';
    }
    return format;
  }

  private async parseWithN3(content: string, format: string): Promise<Store> {
    return new Promise((resolve, reject) => {
      const parser = new N3Parser({ format, factory: rdfDataModel });
      const store = new Store();
      parser.parse(content, (error, quad) => {
        if (error) {
          reject(error);
          return;
        }
        if (quad) {
          store.addQuad(quad);
        } else {
          resolve(store);
        }
      });
    });
  }

  private async parseRdfXml(content: string): Promise<Store> {
    return new Promise((resolve, reject) => {
      const parser = new RdfXmlParser({ dataFactory: rdfDataModel });
      const store = new Store();
      const quadStream = parser.import(Readable.from([content]));
      quadStream.on('data', (quad: any) => store.addQuad(quad));
      quadStream.on('error', reject);
      quadStream.on('end', () => resolve(store));
    });
  }

  /**
   * Normalize RDF content to Turtle format
   */
  async normalizeToTurtle(content: string, options: NormalizeOptions = {}): Promise<string> {
    try {
      const { isUrl = false, format, url, contentType } = options;
      let rdfContent = content;

      if (isUrl && url) {
        rdfContent = await this.fetchRDFContent(url);
      } else if (isUrl) {
        rdfContent = await this.fetchRDFContent(content);
      }

      const detectedFormat = format || this.detectFormat(rdfContent, url, contentType || undefined);
      const store = await this.parseRDF(rdfContent, detectedFormat);
      return this.storeToTurtle(store);
    } catch (error) {
      console.error('Error normalizing RDF to Turtle:', error);
      throw error;
    }
  }

  /** Fetch RDF content from URL */
  async fetchRDFContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/turtle, application/rdf+xml, application/ld+json, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch RDF content: ${response.status} ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Fetch failed:', error);
      throw new Error(`Could not fetch RDF content from ${url}. It might be blocked by CORS policy.`);
    }
  }

  /** Detect RDF format from content or URL extension */
  detectFormat(content: string, url?: string, contentType?: string | null): string {
    if (contentType) {
      const lowered = contentType.toLowerCase();
      if (lowered.includes('rdf+xml') || lowered.includes('application/xml') || lowered.includes('application/rdf+xml')) {
        return 'application/rdf+xml';
      }
      if (lowered.includes('turtle') || lowered.includes('text/turtle')) {
        return 'text/turtle';
      }
      if (lowered.includes('ld+json') || lowered.includes('application/json') || lowered.includes('json')) {
        return 'application/ld+json';
      }
      if (lowered.includes('n-triples')) {
        return 'application/n-triples';
      }
    }

    if (url) {
      const loweredUrl = url.toLowerCase();
      if (loweredUrl.endsWith('.ttl')) return 'text/turtle';
      if (loweredUrl.endsWith('.rdf') || loweredUrl.endsWith('.xml')) return 'application/rdf+xml';
      if (loweredUrl.endsWith('.jsonld') || loweredUrl.endsWith('.json')) return 'application/ld+json';
      if (loweredUrl.endsWith('.nt')) return 'application/n-triples';
    }

    const trimmed = content.trim();
    if (!trimmed) return 'text/turtle';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'application/ld+json';
    if (trimmed.includes('<?xml') || trimmed.includes('<rdf:RDF') || trimmed.includes(':RDF')) return 'application/rdf+xml';

    // Default to Turtle
    return 'text/turtle';
  }

  private async storeToTurtle(store: Store): Promise<string> {
    return new Promise((resolve, reject) => {
      const writer = new Writer({ format: 'text/turtle' });
      // @ts-expect-error - getQuads may not be exposed in all type versions
      const quads = store.getQuads(null, null, null, null);
      for (const quad of quads) {
        writer.addQuad(quad);
      }
      writer.end((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
}

export default new RDFService();