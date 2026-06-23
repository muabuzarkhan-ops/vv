export interface FieldWorkerProfile {
  id: string;
  password: string;
  name: string;
  role: string;
}

export const FIELD_WORKERS: FieldWorkerProfile[] = [
  { id: '483921', password: 'NTD@2026', name: 'Administrator', role: 'Administrator' },
  { id: '715408', password: 'Demo#451', name: 'Data Manager', role: 'Data Manager' },
  { id: '290637', password: 'WestA!89', name: 'Epidemiologist', role: 'Epidemiologist' },
  { id: '864215', password: 'Health$72', name: 'Field Officer', role: 'Field Officer' },
  { id: '531790', password: 'Benin@55', name: 'Program Manager', role: 'Program Manager' },
  { id: '107346', password: 'Africa#91', name: 'Surveillance Officer', role: 'Surveillance Officer' },
  { id: '698124', password: 'Survey!43', name: 'Data Entry', role: 'Data Entry' },
  { id: '245871', password: 'Data@786', name: 'Regional Coordinator', role: 'Regional Coordinator' },
  { id: '372509', password: 'Report#66', name: 'Analyst', role: 'Analyst' },
  { id: '956183', password: 'Admin!25', name: 'Super User', role: 'Super User' },
];
