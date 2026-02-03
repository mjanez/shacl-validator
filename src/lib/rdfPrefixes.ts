/**
 * Shared RDF/SHACL IRI prefixes and utility functions
 * Consolidated here to avoid duplication across components and services
 */

export interface IriPrefix {
  iri: string;
  prefix: string;
}

/**
 * Common RDF namespace prefixes used in DCAT-AP and related vocabularies
 */
export const iriPrefixes: IriPrefix[] = [
  { iri: 'http://www.w3.org/ns/adms#', prefix: 'adms' },
  { iri: 'http://www.w3.org/2011/content#', prefix: 'cnt' },
  { iri: 'http://www.w3.org/ns/dcat#', prefix: 'dcat' },
  { iri: 'http://data.europa.eu/r5r/', prefix: 'dcatap' },
  { iri: 'http://purl.org/dc/terms/', prefix: 'dct' },
  { iri: 'http://data.europa.eu/eli/ontology#', prefix: 'eli' },
  { iri: 'http://xmlns.com/foaf/0.1/', prefix: 'foaf' },
  { iri: 'http://www.opengis.net/ont/geosparql#', prefix: 'geo' },
  { iri: 'http://www.w3.org/ns/locn#', prefix: 'locn' },
  { iri: 'http://www.w3.org/ns/odrl/2/', prefix: 'odrl' },
  { iri: 'http://www.w3.org/ns/prov#', prefix: 'prov' },
  { iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', prefix: 'rdf' },
  { iri: 'http://www.w3.org/2000/01/rdf-schema#', prefix: 'rdfs' },
  { iri: 'http://schema.org/', prefix: 'schema' },
  { iri: 'http://www.w3.org/2004/02/skos/core#', prefix: 'skos' },
  { iri: 'http://spdx.org/rdf/terms#', prefix: 'spdx' },
  { iri: 'http://www.w3.org/2006/time#', prefix: 'time' },
  { iri: 'http://www.w3.org/2006/vcard/ns#', prefix: 'vcard' },
  { iri: 'http://www.w3.org/2001/XMLSchema#', prefix: 'xsd' },
  { iri: 'http://www.w3.org/ns/dqv#', prefix: 'dqv' },
  { iri: 'http://www.w3.org/ns/shacl#', prefix: 'sh' },
  { iri: 'http://www.w3.org/2002/07/owl#', prefix: 'owl' }
];

/**
 * Compacts a full IRI to prefixed notation (e.g., http://purl.org/dc/terms/title -> dct:title)
 */
export const compactIri = (value?: string): string => {
  if (!value) return '—';
  const match = iriPrefixes.find((entry) => value.startsWith(entry.iri));
  if (match) {
    return `${match.prefix}:${value.slice(match.iri.length)}`;
  }
  const hashIndex = value.lastIndexOf('#');
  if (hashIndex >= 0 && hashIndex < value.length - 1) {
    return value.slice(hashIndex + 1);
  }
  const slashIndex = value.lastIndexOf('/');
  if (slashIndex >= 0 && slashIndex < value.length - 1) {
    return value.slice(slashIndex + 1);
  }
  return value;
};

/**
 * Expands a prefixed IRI to full form (e.g., dct:title -> http://purl.org/dc/terms/title)
 */
export const expandIri = (compactIri: string): string => {
  const match = iriPrefixes.find((entry) => compactIri.startsWith(`${entry.prefix}:`));
  if (match) {
    return compactIri.replace(`${match.prefix}:`, match.iri);
  }
  return compactIri;
};

/**
 * Extracts a short type name from a full IRI
 * e.g., "http://xmlns.com/foaf/0.1/Agent" -> "foaf:Agent"
 */
export const extractTypeName = (typeIri: string): string => {
  const match = iriPrefixes.find((entry) => typeIri.startsWith(entry.iri));
  if (match) {
    return `${match.prefix}:${typeIri.slice(match.iri.length)}`;
  }
  const hashIndex = typeIri.lastIndexOf('#');
  if (hashIndex >= 0) return typeIri.slice(hashIndex + 1);
  const slashIndex = typeIri.lastIndexOf('/');
  if (slashIndex >= 0) return typeIri.slice(slashIndex + 1);
  return typeIri;
};

/**
 * DCAT-AP-ES documentation URL patterns
 */
const DCAT_AP_ES_DOC_BASE = 'https://datosgobes.github.io/DCAT-AP-ES';

/**
 * Infers the DCAT entity from a source shape IRI or compact name
 * This is the primary method to determine entity context for documentation URLs
 */
const inferEntityFromShape = (sourceShape?: string): string | undefined => {
  if (!sourceShape) return undefined;
  
  const shapeCompact = sourceShape.startsWith('http') 
    ? compactIri(sourceShape).toLowerCase() 
    : sourceShape.toLowerCase();
  
  // Remove common suffixes and separators to get the core entity name
  const cleanShape = shapeCompact
    .replace(/shape$/i, '')
    .replace(/nodeshape$/i, '')
    .replace(/propertyshape$/i, '')
    .replace(/_/g, '')
    .replace(/-/g, '')
    .replace(/:/g, '');
  
  // Map common patterns to DCAT-AP-ES entities
  // Order matters: check most specific patterns first
  if (cleanShape.includes('catalogrecord')) return 'CatalogRecord';
  if (cleanShape.includes('datasetseries')) return 'DatasetSeries';
  if (cleanShape.includes('dataservice')) return 'DataService';
  if (cleanShape.includes('distribution')) return 'Distribution';
  if (cleanShape.includes('dataset')) return 'Dataset';
  if (cleanShape.includes('catalog')) return 'Catalog';
  if (cleanShape.includes('organization')) return 'Agent';  // Organization is a subclass of Agent
  if (cleanShape.includes('agent')) return 'Agent';
  if (cleanShape.includes('person')) return 'Agent';
  if (cleanShape.includes('attribution')) return 'Attribution';
  if (cleanShape.includes('relationship')) return 'Relationship';
  if (cleanShape.includes('periodof') || cleanShape.includes('perioftime')) return 'PeriodOfTime';
  if (cleanShape.includes('location')) return 'Location';
  if (cleanShape.includes('checksum')) return 'Checksum';
  if (cleanShape.includes('identifier')) return 'Identifier';
  if (cleanShape.includes('standard')) return 'Standard';
  if (cleanShape.includes('document')) return 'Document';
  if (cleanShape.includes('concept')) return 'Concept';
  if (cleanShape.includes('kind') || cleanShape.includes('vcard')) return 'Kind';
  
  return undefined;
};

/**
 * Builds a documentation URL for the DCAT-AP-ES guide based on the property path
 * Strategy: Always try to determine the entity context from sourceShape for Entity.property format
 * @param path The property path (e.g., "http://purl.org/dc/terms/publisher" or "dct:publisher")
 * @param sourceShape Optional source shape to help determine the entity context
 * @returns Documentation URL or undefined if not applicable
 */
export const buildDcatApEsDocUrl = (path?: string, sourceShape?: string): string | undefined => {
  if (!path) return undefined;
  
  // Compact the path if it's a full IRI
  const compactPath = path.startsWith('http') ? compactIri(path) : path;
  
  // Extract just the property name (e.g., "publisher" from "dct:publisher")
  const colonIndex = compactPath.indexOf(':');
  const propertyName = colonIndex >= 0 ? compactPath.slice(colonIndex + 1) : compactPath;
  
  if (!propertyName) return undefined;
  
  // ALWAYS try to infer entity from sourceShape first (most accurate)
  const entity = inferEntityFromShape(sourceShape);
  
  // Build URL with entity context (preferred format: Entity.property)
  if (entity && propertyName) {
    return `${DCAT_AP_ES_DOC_BASE}/#${entity}.${propertyName}`;
  }
  
  // FALLBACK: Use direct property anchor only if we couldn't determine entity
  // This should be rare - most SHACL violations have sourceShape
  return `${DCAT_AP_ES_DOC_BASE}/#${propertyName}`;
};

/**
 * Extracts URLs from a message text
 * @param text The message text that may contain URLs
 * @returns Array of URLs found in the text
 */
export const extractUrlsFromText = (text: string): string[] => {
  const urlRegex = /https?:\/\/[^\s<>)]+/gi;
  const matches = text.match(urlRegex);
  return matches || [];
};

/**
 * Checks if a URL points to DCAT-AP-ES documentation
 */
export const isDcatApEsDocUrl = (url: string): boolean => {
  return url.startsWith(DCAT_AP_ES_DOC_BASE);
};
