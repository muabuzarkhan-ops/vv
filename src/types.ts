export interface RecordItem {
  id: string;
  partner: string;
  theme: string;
  country: string;
  region: string;
  level: string;
  disease: string;
  evidence: string;
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

export interface UserState {
  name: string;
  email: string;
  role: 'Field officer' | 'Analyst' | 'Admin';
  org: string;
  serverUrl: string;
  token?: string;
  authProvider?: 'google' | 'local';
}

export interface DatabaseState {
  records: RecordItem[];
  documents: DocumentItem[];
}
