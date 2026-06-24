export interface RecordItem {
  id: string;
  partner: string;
  projectName?: string;
  interventionType?: string;
  targetPopulation?: string;
  theme: string;
  country: string;
  region: string;
  level: string;
  disease: string;
  evidence: string;
  outcomes?: string;
  evidenceStatements?: string;
  risks?: string;
  lessonsLearned?: string;
  resultType: 'Policy change' | 'Service delivery' | 'Capacity building' | 'Research output' | 'Community engagement' | 'System strengthening';
  reached: number;
  confidence: 'High' | 'Medium' | 'Low';
  source: string;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  submittedBy?: string;
  submittedByRole?: string;
  approvedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  projectDate?: string;
  projectEndDate?: string;
  fundingStream?: string;
}

export interface DocumentItem {
  id: string;
  fileName: string;
  size: number;
  source: string;
  extractedCount: number;
  status: 'Saved locally' | 'Uploaded to server' | 'Extracted successfully' | 'Failed';
  uploadedAt: string;
  content?: string;
}

export interface FilterState {
  theme: string;
  country: string;
  level: string;
  disease: string;
  resultType: string;
  search: string;
}

export type UserRole =
  | 'Partner User'
  | 'Reviewer'
  | 'M&E Officer'
  | 'Country Coordinator'
  | 'Administrator'
  | 'Field officer'
  | 'Analyst'
  | 'Admin';

export interface UserState {
  name: string;
  email: string;
  role: UserRole;
  org: string;
  serverUrl: string;
  token?: string;
  authProvider?: 'google' | 'local';
}

export interface Indicator {
  title: string;
  definition: string;
  formula: string;
  dataSource: string;
  frequency: string;
  baseline: string;
  target: string;
}

export interface TheoryOfChangeModel {
  id: string;
  projectName: string;
  sourceDocument: string;
  description: string;
  narrative: string;
  toc: {
    inputs: string[];
    activities: string[];
    outputs: string[];
    outcomes: string[];
    intermediateOutcomes: string[];
    longTermOutcomes: string[];
    impact: string;
    assumptions: string[];
    risks: string[];
    indicators: Indicator[];
  };
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface DatabaseState {
  records: RecordItem[];
  documents: DocumentItem[];
}
