export type ValidationProfile = 'dcat_ap' | 'dcat_ap_es' | 'dcat_ap_es_hvd' | 'nti_risp';

export interface ProfileSelection {
  profile: ValidationProfile;
  version: string;
  branch?: string;
}

export type SHACLSeverity = 'Violation' | 'Warning' | 'Info';

export interface SHACLMessage {
  text: string;
  lang?: string | null;
}

export interface SHACLViolation {
  severity: SHACLSeverity;
  focusNode?: string;
  path?: string;
  value?: string;
  message: SHACLMessage[];
  sourceConstraintComponent?: string;
  sourceShape?: string;
  resultSeverity?: string;
  foafPage?: string;
  translationKey?: string;
  translationParams?: Record<string, any>;
}

export interface SHACLReport {
  profile: ValidationProfile | string;
  conforms: boolean;
  totalViolations: number;
  violations: SHACLViolation[];
  warnings: SHACLViolation[];
  infos: SHACLViolation[];
  timestamp: string;
  reportDataset?: any;
}

export interface SHACLValidationResult {
  conforms: boolean;
  results: SHACLViolation[];
  text?: string;
  graph?: any;
}

export interface ExtendedValidationResult {
  content: string;
  profile?: ValidationProfile;
  report?: SHACLReport;
  timestamp?: string;
}

export interface MQAConfigProfileVersion {
  name: string;
  url?: string;
  sampleUrl?: string;
  shaclFiles: string[];
  icon?: string;
}

export interface MQAConfigProfile {
  defaultVersion: string;
  defaultBranch?: string;
  branches?: Record<string, string>;
  versions: Record<string, MQAConfigProfileVersion>;
}

export interface MQAConfig {
  app_info?: {
    name?: string;
    version?: string;
    repository?: string;
    url?: string;
    see_also?: string;
    description?: string;
  };
  profiles: Record<ValidationProfile | string, MQAConfigProfile>;
}
