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
 * Extracts URLs from a message text
 * @param text The message text that may contain URLs
 * @returns Array of URLs found in the text
 */
export const extractUrlsFromText = (text: string): string[] => {
  const urlRegex = /https?:\/\/[^\s<>)]+/gi;
  const matches = text.match(urlRegex);
  return matches || [];
};
