import * as Comlink from 'comlink';
import { Parser } from 'n3';
import { SHACLReport, SHACLViolation, SHACLSeverity, SHACLMessage } from '../types';

interface FlattenedRow extends SHACLViolation {
  id: string;
  constraintKey: string;
}

const parseShaclReport = async (ttlContent: string): Promise<SHACLReport> => {
  return new Promise((resolve, reject) => {
    const parser = new Parser();
    const quads: any[] = [];

    parser.parse(ttlContent, (err, quad) => {
      if (err) {
        reject(err);
        return;
      }
      if (quad) {
        quads.push(quad);
      } else {
        try {
          resolve(buildReportFromQuads(quads));
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};

const normalizeLang = (lang?: string | null): string | undefined => {
  if (!lang) return undefined;
  return lang.toLowerCase().split('-')[0];
};

const buildReportFromQuads = (quads: any[]): SHACLReport => {
  const rdfType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
  const validationReport = 'http://www.w3.org/ns/shacl#ValidationReport';
  const resultPredicate = 'http://www.w3.org/ns/shacl#result';
  const foafPage = 'http://xmlns.com/foaf/0.1/page';

  const reportNode = quads.find((q) => q.predicate.value === rdfType && q.object.value === validationReport)?.subject;
  if (!reportNode) {
    throw new Error('No sh:ValidationReport found in the input.');
  }

  const conformsQuad = quads.find((q) => q.subject.equals(reportNode) && q.predicate.value === 'http://www.w3.org/ns/shacl#conforms');
  const conforms = conformsQuad?.object.value === 'true';

  const resultNodes = quads
    .filter((q) => q.subject.equals(reportNode) && q.predicate.value === resultPredicate)
    .map((q) => q.object);

  const violations: SHACLViolation[] = [];
  const warnings: SHACLViolation[] = [];
  const infos: SHACLViolation[] = [];

  const getObject = (node: any, predicate: string) =>
    quads.find((q) => q.subject.equals(node) && q.predicate.value === predicate)?.object;
  const getObjects = (node: any, predicate: string) =>
    quads.filter((q) => q.subject.equals(node) && q.predicate.value === predicate).map((q) => q.object);
  const getValue = (node: any, predicate: string) => getObject(node, predicate)?.value || '';
  const getLiteralMessages = (node: any, predicate: string): SHACLMessage[] =>
    getObjects(node, predicate)
      .map((obj) => {
        if (!obj?.value) return null;
        return {
          text: obj.value,
          lang: normalizeLang(obj.language)
        } as SHACLMessage;
      })
      .filter((entry): entry is SHACLMessage => Boolean(entry?.text));

  for (const resNode of resultNodes) {
    const severityUri = getValue(resNode, 'http://www.w3.org/ns/shacl#resultSeverity');
    let severity: SHACLSeverity = 'Violation';
    if (severityUri?.endsWith('Warning')) severity = 'Warning';
    if (severityUri?.endsWith('Info')) severity = 'Info';

    const sourceShapeNode = getObject(resNode, 'http://www.w3.org/ns/shacl#sourceShape');
    const sourceShape = sourceShapeNode?.value || '';
    const docLink = sourceShapeNode ? getValue(sourceShapeNode, foafPage) : '';
    const messages = getLiteralMessages(resNode, 'http://www.w3.org/ns/shacl#resultMessage');

    const violation: SHACLViolation = {
      severity,
      focusNode: getValue(resNode, 'http://www.w3.org/ns/shacl#focusNode'),
      path: getValue(resNode, 'http://www.w3.org/ns/shacl#resultPath'),
      value: getValue(resNode, 'http://www.w3.org/ns/shacl#value'),
      message: messages,
      sourceConstraintComponent: getValue(resNode, 'http://www.w3.org/ns/shacl#sourceConstraintComponent'),
      sourceShape,
      foafPage: docLink || undefined
    };

    if (severity === 'Violation') violations.push(violation);
    else if (severity === 'Warning') warnings.push(violation);
    else infos.push(violation);
  }

  return {
    conforms,
    violations,
    warnings,
    infos,
    totalViolations: violations.length,
    profile: 'imported-report' as any,
    timestamp: new Date().toISOString()
  };
};

const flattenReport = (report: SHACLReport) => {
  const rows: FlattenedRow[] = [];
  const append = (entry: SHACLViolation, index: number) => {
    rows.push({
      ...entry,
      id: `${entry.severity}-${index}-${entry.focusNode}`,
      constraintKey: `${entry.sourceShape}-${entry.sourceConstraintComponent}`
    });
  };
  report.violations.forEach(append);
  report.warnings.forEach((row, idx) => append(row, report.violations.length + idx));
  report.infos.forEach((row, idx) => append(row, report.violations.length + report.warnings.length + idx));

  const summary = {
    violation: report.violations.length,
    warning: report.warnings.length,
    info: report.infos.length,
    total: rows.length
  };

  return { rows, summary };
};

const workerApi = {
  parseShaclReport,
  flattenReport
};

Comlink.expose(workerApi);
export type ReportWorkerApi = typeof workerApi;
export type { FlattenedRow };
