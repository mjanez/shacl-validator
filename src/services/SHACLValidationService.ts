import { Validator } from 'shacl-engine';
import { validations as sparqlValidations } from 'shacl-engine/sparql.js';
import rdfDataModel from '@rdfjs/data-model';
import rdfDataset from '@rdfjs/dataset';
import { Parser as N3Parser } from 'n3';
import RDFService from './RDFService';
import {
  ValidationProfile,
  SHACLValidationResult,
  SHACLReport,
  SHACLViolation,
  SHACLSeverity,
  SHACLMessage,
  MQAConfig,
  ProfileSelection
} from '../types';
import mqaConfigData from '../config/mqa-config.json';

class SHACLValidationService {
  private static shaclShapesCache: Map<ValidationProfile | string, any> = new Map();
  private static readonly FOAF_PAGE_PREDICATE = 'http://xmlns.com/foaf/0.1/page';

  private static containsDir3Reference(value: any, depth: number = 0): boolean {
    if (depth > 10 || value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.includes('DIR3OrganismRestriction');
    }
    if (Array.isArray(value)) {
      return value.some((item) => this.containsDir3Reference(item, depth + 1));
    }
    if (typeof value === 'object') {
      return Object.values(value).some((item) => this.containsDir3Reference(item, depth + 1));
    }
    return false;
  }

  private static async parseSHACLContent(content: string, fileName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const cleanedContent = this.cleanSHACLRegexPatterns(content);
      
      const parser = new N3Parser({ factory: rdfDataModel });
      const parsedQuads: any[] = [];

      parser.parse(cleanedContent, (error, quad) => {
        if (error) {
          console.error(`Parse error in ${fileName}:`, error);
          reject(error);
          return;
        }
        if (quad) {
          parsedQuads.push(quad);
        } else {
          resolve(parsedQuads);
        }
      });
    });
  }

  /** Replaces PCRE regex patterns with JavaScript-compatible equivalents */
  private static cleanSHACLRegexPatterns(content: string): string {
    let cleaned = content;
    let replacements = 0;
    
    const problematicPattern = /sh:pattern\s+"[^"]*\(\?\:?s\)[^"]*"\s*;/g;
    const matches = content.match(problematicPattern);
    
    if (matches) {
      cleaned = cleaned.replace(
        /sh:pattern\s+"[^"]*\(\?\:?s\)\(\?\=\.\*\\+S\)[^"]*"\s*;/g,
        'sh:pattern "^[\\\\s\\\\S]*\\\\S[\\\\s\\\\S]*$" ;'
      );
      
      cleaned = cleaned.replace(
        'sh:pattern "^(?s)(?=.*\\\\S).*$"',
        'sh:pattern "^[\\\\s\\\\S]*\\\\S[\\\\s\\\\S]*$"'
      );
      
      replacements = matches.length;
    }
    
    return cleaned;
  }

  private static getSHACLFilesForProfile(profile: ValidationProfile, branch?: string): string[] {
    const mqaConfig = mqaConfigData as MQAConfig;
    const profileConfig = mqaConfig.profiles[profile];
    if (!profileConfig) return [];
    
    const version = profileConfig.defaultVersion;
    const versionConfig = profileConfig.versions[version];
    const shaclFiles = versionConfig?.shaclFiles || [];
    
    const selectedBranch = branch || profileConfig.defaultBranch || 'main';
    return shaclFiles.map(file => file.replace('{branch}', selectedBranch));
  }

  private static async getSHACLShapes(profile: ValidationProfile, branch?: string): Promise<any> {
    const cacheKey = branch ? `${profile}:${branch}` : profile;
    
    if (this.shaclShapesCache.has(cacheKey)) {
      return this.shaclShapesCache.get(cacheKey);
    }

    const dataset = rdfDataset.dataset();
    const files = this.getSHACLFilesForProfile(profile, branch);

    for (const shaclFile of files) {
      const url = shaclFile.startsWith('http') ? shaclFile : `/${shaclFile}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch SHACL file ${url}: ${response.status}`);
        continue;
      }
      const text = await response.text();
      const quads = await this.parseSHACLContent(text, shaclFile);
      quads.forEach((q) => dataset.add(q));
    }

    this.shaclShapesCache.set(cacheKey, dataset);
    return dataset;
  }

  private static async parseCustomSHACL(shaclContents: string[]): Promise<any> {
    const dataset = rdfDataset.dataset();
    
    for (let i = 0; i < shaclContents.length; i++) {
      const content = shaclContents[i];
      const fileName = `File #${i + 1}`;
      
      try {
        const quads = await this.parseSHACLContent(content, `custom-shacl-${i + 1}.ttl`);
        quads.forEach((q) => dataset.add(q));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Failed to parse custom SHACL ${fileName}:`, error);
        throw new Error(`Invalid SHACL syntax in ${fileName}: ${errorMsg}`);
      }
    }
    
    return dataset;
  }

  private static normalizeDataFormat(format?: string): string {
    if (!format) return 'text/turtle';
    const lower = format.toLowerCase();
    if (lower === 'turtle') return 'text/turtle';
    if (lower === 'application/xml' || lower.includes('rdf+xml')) return 'application/rdf+xml';
    return format;
  }

  private static async parseRDFContent(content: string, format: string = 'text/turtle'): Promise<any> {
    const dataset = rdfDataset.dataset();
    const normalizedFormat = this.normalizeDataFormat(format);
    try {
      const store = await RDFService.parseRDF(content, normalizedFormat);
      const quads = store.getQuads(null, null, null, null);
      for (const quad of quads) {
        dataset.add(quad);
      }
      return dataset;
    } catch (error) {
      console.error('Failed to parse RDF content', error);
      return new Promise((resolve, reject) => {
        const parser = new N3Parser({ format: normalizedFormat, factory: rdfDataModel });
        parser.parse(content, (parseError, quad) => {
          if (parseError) {
            reject(parseError);
            return;
          }
          if (quad) {
            dataset.add(quad);
          } else {
            resolve(dataset);
          }
        });
      });
    }
  }

  private static extractTermValue(term: any): string {
    if (!term) return '';
    if (typeof term === 'string') return term;
    if (Array.isArray(term)) return term.length ? this.extractTermValue(term[0]) : '';
    if (term.value) return String(term.value);
    if (term.id) return String(term.id);
    if (term.termType && term.termType === 'BlankNode' && term.value) return term.value;
    return term.toString ? term.toString() : '';
  }

  private static extractPath(path: any): string {
    if (!path) return '';
    if (typeof path === 'string') return path;
    
    if (!Array.isArray(path)) {
      const extracted = this.extractTermValue(path);
      if (extracted && extracted !== '[object Object]') {
        return extracted;
      }
      console.warn('⚠️ Failed to extract path from non-array object:', path);
      return '';
    }
    
    const parts: string[] = [];
    for (const item of path) {
      if (!item) continue;
      
      if (item.predicates && Array.isArray(item.predicates)) {
        const predicateValues = item.predicates
          .map((pred: any) => this.extractTermValue(pred))
          .filter((v: string) => v && v !== '[object Object]');
        
        if (predicateValues.length === 1) {
          parts.push(predicateValues[0]);
        } else if (predicateValues.length > 1) {
          parts.push(`(${predicateValues.join(' | ')})`);
        }
      } else {
        const itemValue = this.extractTermValue(item);
        if (itemValue && itemValue !== '[object Object]') {
          parts.push(itemValue);
        }
      }
    }
    
    const finalPath = parts.length > 0 ? parts.join('/') : '';
    if (!finalPath) {
      console.warn('⚠️ Could not extract meaningful path from:', path);
    }
    return finalPath;
  }

  private static resolveFoafPage(shapes: any, sourceShape?: string): string | undefined {
    if (!sourceShape || !shapes?.match) return undefined;
    if (!sourceShape.startsWith('http')) return undefined;
    try {
      const matches = shapes.match(
        rdfDataModel.namedNode(sourceShape),
        rdfDataModel.namedNode(this.FOAF_PAGE_PREDICATE),
        null,
        null
      );
      for (const quad of matches) {
        const candidate = this.extractTermValue(quad?.object);
        if (candidate) {
          return candidate;
        }
      }
    } catch (error) {
      console.warn('[SHACL] Unable to resolve foaf:page for shape', sourceShape, error);
    }
    return undefined;
  }

  private static normalizeLang(lang?: string | null): string | undefined {
    if (!lang) return undefined;
    return lang.toLowerCase().split('-')[0];
  }

  private static extractMessages(result: any, preferredLang?: string): SHACLMessage[] {
    const serializeLiteral = (literal: any): SHACLMessage | null => {
      const text = this.extractTermValue(literal);
      if (!text) return null;
      const lang = typeof literal?.language === 'string' ? this.normalizeLang(literal.language) : undefined;
      return { text, lang };
    };

    if (result.message) {
      const raw = Array.isArray(result.message) ? result.message : [result.message];
      return raw.map(serializeLiteral).filter((entry): entry is SHACLMessage => Boolean(entry));
    }

    const path = this.extractPath(result.path);
    const value = this.extractTermValue(result.value);
    return [{ text: `Validation issue at ${path || 'unknown path'}${value ? ` with value ${value}` : ''}`, lang: preferredLang }];
  }

  private static mapSeverityFromSHACLEngine(severity: any): SHACLSeverity {
    const value = this.extractTermValue(severity).toLowerCase();
    if (value.includes('warning')) return 'Warning';
    if (value.includes('info')) return 'Info';
    return 'Violation';
  }

  private static parseSHACLResult(
    validationReport: any,
    shapes: any,
    profile: ValidationProfile,
    preferredLanguage?: string
  ): SHACLValidationResult {
    const results: SHACLViolation[] = [];
    const rawResults = validationReport?.results || [];

    for (const result of rawResults) {
      const sourceShape = this.extractTermValue(result.sourceShape);
      const violation: SHACLViolation = {
        focusNode: this.extractTermValue(result.focusNode),
        path: this.extractPath(result.path),
        value: this.extractTermValue(result.value),
        message: this.extractMessages(result, preferredLanguage),
        severity: this.mapSeverityFromSHACLEngine(result.severity || result.resultSeverity),
        sourceConstraintComponent: this.extractTermValue(result.sourceConstraintComponent || result.constraintComponent),
        sourceShape,
        resultSeverity: this.extractTermValue(result.resultSeverity),
        foafPage: this.resolveFoafPage(shapes, sourceShape)
      };

      if (this.containsDir3Reference(result) || this.containsDir3Reference(violation)) {
        console.debug('[SHACL][DIR3] Restriction triggered', {
          focusNode: violation.focusNode,
          path: violation.path,
          value: violation.value,
          severity: violation.severity,
          sourceConstraintComponent: violation.sourceConstraintComponent,
          sourceShape: violation.sourceShape,
          messages: violation.message
        });
      }
      results.push(violation);
    }

    return {
      conforms: Boolean(validationReport?.conforms),
      results,
      text: validationReport?.text,
      graph: validationReport?.graph
    };
  }

  public static async validateRDF(
    rdfContent: string,
    profile: ValidationProfile,
    format: string = 'turtle',
    language: string = 'es',
    branch?: string,
    customShacl?: string[],
    mode?: 'predefined' | 'custom'
  ): Promise<SHACLReport> {
    let shapes: any;
    
    // Use custom SHACL if mode is 'custom' and customShacl is provided
    if (mode === 'custom' && customShacl && customShacl.length > 0) {
      shapes = await this.parseCustomSHACL(customShacl);
    } else {
      shapes = await this.getSHACLShapes(profile, branch);
    }
    
    const preferredLanguage = this.normalizeLang(language) || 'es';

    if (!shapes || Array.from(shapes).length === 0) {
      return {
        profile,
        conforms: false,
        totalViolations: 1,
        violations: [
          {
            severity: 'Violation',
            message: [{ text: 'No SHACL shapes could be loaded for the selected profile.', lang: preferredLanguage }],
            sourceConstraintComponent: 'system:NoShapes',
            sourceShape: 'system:NoShapes'
          }
        ],
        warnings: [],
        infos: [],
        timestamp: new Date().toISOString()
      };
    }

    const data = await this.parseRDFContent(rdfContent, format);
    if (!data || Array.from(data).length === 0) {
      return {
        profile,
        conforms: false,
        totalViolations: 1,
        violations: [
          {
            severity: 'Violation',
            message: [{ text: 'No RDF data found to validate.', lang: preferredLanguage }],
            sourceConstraintComponent: 'system:EmptyContent',
            sourceShape: 'system:Validation'
          }
        ],
        warnings: [],
        infos: [],
        timestamp: new Date().toISOString()
      };
    }

    const validator = new Validator(shapes, {
      factory: rdfDataModel,
      debug: false,
      details: true,
      validations: sparqlValidations
    });

    const report = await validator.validate({ dataset: data });
    const parsed = this.parseSHACLResult(report, shapes, profile, preferredLanguage);

    const violations = parsed.results.filter((r) => r.severity === 'Violation');
    const warnings = parsed.results.filter((r) => r.severity === 'Warning');
    const infos = parsed.results.filter((r) => r.severity === 'Info');

    return {
      profile,
      conforms: parsed.conforms,
      totalViolations: violations.length,
      violations,
      warnings,
      infos,
      timestamp: new Date().toISOString()
    };
  }

  public static async exportReportAsTurtle(
    report: SHACLReport,
    profileSelection?: ProfileSelection,
    profileVersion?: string
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    const mqaConfig = mqaConfigData as MQAConfig;
    const appInfo = mqaConfig.app_info;
    const profileId = report.profile;
    const profileConfig = (mqaConfig.profiles as Record<string, any>)[profileId] || {};
    const version = profileVersion || profileSelection?.version || profileConfig?.defaultVersion;
    const versionConfig = version && profileConfig?.versions ? profileConfig.versions[version] : undefined;
    const profileName = versionConfig?.name || String(profileId);
    const profileUrl = versionConfig?.url;
    const profileIdentifier = `${profileId}-${version || 'unknown'}`;

    // Count issues by severity
    const violationCount = report.violations.length;
    const warningCount = report.warnings.length;
    const infoCount = report.infos.length;
    const totalIssues = violationCount + warningCount + infoCount;

    // Build prefixes
    let turtle = `@prefix sh: <http://www.w3.org/ns/shacl#> .\n`;
    turtle += `@prefix dct: <http://purl.org/dc/terms/> .\n`;
    turtle += `@prefix dcat: <http://www.w3.org/ns/dcat#> .\n`;
    turtle += `@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n`;
    turtle += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n`;
    turtle += `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n`;
    turtle += `@prefix doap: <http://usefulinc.com/ns/doap#> .\n`;
    turtle += `\n`;

    // Validation Report
    turtle += `# Validation Report\n`;
    turtle += `[ a sh:ValidationReport ;\n`;
    turtle += `    sh:conforms ${report.conforms} ;\n`;
    turtle += `    dct:created "${timestamp}"^^xsd:dateTime ;\n`;
    
    // Creator (Agent with app info)
    turtle += `    dct:creator [ a foaf:Agent ;\n`;
    turtle += `            foaf:name "${appInfo.name}" ;\n`;
    turtle += `            doap:release [ a doap:Version ;\n`;
    turtle += `                    doap:revision "${appInfo.version}" ;\n`;
    turtle += `                    doap:created "${timestamp}"^^xsd:dateTime\n`;
    turtle += `                  ] ;\n`;
    turtle += `            foaf:homepage <${appInfo.url}> ;\n`;
    turtle += `            foaf:page <${appInfo.repository}> ;\n`;
    turtle += `            rdfs:seeAlso <${appInfo.see_also}> ;\n`;
    turtle += `            rdfs:comment "${appInfo.description.replace(/"/g, '\\"')}"\n`;
    turtle += `          ] ;\n`;

    // Titles (bilingual)
    turtle += `    dct:title "Informe de Validación SHACL para el perfil ${profileName} generado por ${appInfo.name} v${appInfo.version}"@es ;\n`;
    turtle += `    dct:title "SHACL Validation Report for profile ${profileName} generated by ${appInfo.name} v${appInfo.version}"@en ;\n`;
    
    // Format
    turtle += `    dct:format <http://publications.europa.eu/resource/authority/file-type/RDF_TURTLE> ;\n`;
    
    // Descriptions (bilingual with stats)
    const conformsEs = report.conforms ? 'Conforme (true)' : 'No conforme (false)';
    const conformsEn = report.conforms ? 'Conforms (true)' : 'Does not conform (false)';
    turtle += `    dct:description "Este archivo contiene el informe de validación SHACL para el perfil ${profileName}. Se han detectado ${violationCount} violaciones. Estado de conformidad: ${conformsEs}. Número de advertencias/recomendaciones: ${warningCount}"@es ;\n`;
    turtle += `    dct:description "This file contains the SHACL validation report for profile ${profileName}. A total of ${violationCount} violations were found. Conformance status: ${conformsEn}. Number of warnings/recommendations: ${warningCount}"@en ;\n`;
    
    // Link to profile documentation
    if (profileUrl) {
      turtle += `    rdfs:seeAlso <${profileUrl}> ;\n`;
    }

    // Validation results
    const allIssues = [...report.violations, ...report.warnings, ...report.infos];
    if (allIssues.length > 0) {
      turtle += `    \n    # Validation results\n`;
      turtle += `    sh:result`;
      allIssues.forEach((issue, idx) => {
        const isLast = idx === allIssues.length - 1;
        turtle += ` [ a sh:ValidationResult ;\n`;
        turtle += `        sh:resultSeverity sh:${issue.severity} ;\n`;
        if (issue.focusNode) turtle += `        sh:focusNode <${issue.focusNode}> ;\n`;
        if (issue.path && issue.path !== '[object Object]' && issue.path !== 'undefined') {
          if (issue.path.startsWith('http://') || issue.path.startsWith('https://') || issue.path.includes(':')) {
            turtle += `        sh:resultPath <${issue.path}> ;\n`;
          }
        }
        if (issue.value) {
          const escapedValue = issue.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          turtle += `        sh:value "${escapedValue}" ;\n`;
        }
        issue.message.forEach((msg) => {
          const escaped = msg.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const literal = msg.lang ? `"${escaped}"@${msg.lang}` : `"${escaped}"`;
          turtle += `        sh:resultMessage ${literal} ;\n`;
        });
        if (issue.sourceConstraintComponent) {
          const component = issue.sourceConstraintComponent.startsWith('sh:') 
            ? issue.sourceConstraintComponent 
            : `<${issue.sourceConstraintComponent}>`;
          turtle += `        sh:sourceConstraintComponent ${component} ;\n`;
        }
        if (issue.sourceShape) {
          const shape = issue.sourceShape.startsWith('http') ? `<${issue.sourceShape}>` : issue.sourceShape;
          turtle += `        sh:sourceShape ${shape} ;\n`;
        }
        if (issue.foafPage) turtle += `        foaf:page <${issue.foafPage}> ;\n`;
        // Remove trailing semicolon and newline, add proper ending
        turtle = turtle.replace(/;\n\s*$/, '\n');
        turtle += isLast ? `      ]\n` : `      ] ,\n`;
      });
    }

    turtle += `] .\n\n`;

    // Profile Information section
    turtle += `# Profile Information\n`;
    turtle += `[ a dct:Standard ;\n`;
    turtle += `    dct:title "${profileName}"@es ;\n`;
    turtle += `    dct:title "${profileName}"@en ;\n`;
    turtle += `    dct:identifier "${profileIdentifier}" ;\n`;
    if (version) {
      turtle += `    dct:hasVersion "${version}" ;\n`;
    }
    if (profileUrl) {
      turtle += `    foaf:page <${profileUrl}> ;\n`;
    }
    turtle += `    rdfs:comment "Perfil utilizado para la validación SHACL"@es ;\n`;
    turtle += `    rdfs:comment "Profile used for SHACL validation"@en\n`;
    turtle += `] .\n`;

    return turtle;
  }

  public static async exportReportAsCSV(report: SHACLReport): Promise<string> {
    const headers = ['Severity', 'Focus Node', 'Path', 'Value', 'Message', 'Source Shape', 'Constraint Component'];
    const rows = [headers.join(',')];
    const allIssues = [...report.violations, ...report.warnings, ...report.infos];

    allIssues.forEach((issue) => {
      const row = [
        issue.severity,
        this.escapeCsvValue(issue.focusNode || ''),
        this.escapeCsvValue(issue.path || ''),
        this.escapeCsvValue(issue.value || ''),
        this.escapeCsvValue(issue.message.map((m) => m.text).join(' | ')),
        this.escapeCsvValue(issue.sourceShape || ''),
        this.escapeCsvValue(issue.sourceConstraintComponent || '')
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  private static escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  public static clearCache(): void {
    this.shaclShapesCache.clear();
  }
}

export default SHACLValidationService;
