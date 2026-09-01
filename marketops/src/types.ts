export type Role = 'manager' | 'technician' | 'admin';
export type EquipmentStatus = 'operational' | 'fault' | 'offline';
export type EquipmentType = 'checkout' | 'scale' | 'printer';
export type IncidentStatus = 'open' | 'resolved';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  branchId: number | null;
  branchName: string | null;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  commune: string;
  equipmentTotal?: number;
  operational?: number;
  fault?: number;
  offline?: number;
  openIncidents?: number;
  criticalIncidents?: number;
}

export interface Equipment {
  id: number;
  branchId: number;
  branchName: string;
  code: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  updatedAt: string;
  openIncidents: number;
}

export interface Incident {
  id: number;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  reportedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  equipmentId: number;
  equipmentName: string;
  equipmentCode: string;
  equipmentStatus: EquipmentStatus;
  branchId: number;
  branchName: string;
  reportedBy: string;
  resolvedBy: string | null;
}

export interface DashboardData {
  equipment: {
    total: number;
    operational: number;
    fault: number;
    offline: number;
  };
  incidents: {
    total: number;
    open: number;
    critical: number;
  };
  branches: Branch[];
  recent: Incident[];
}

export type ViewKey =
  | 'overview'
  | 'branches'
  | 'equipment'
  | 'report'
  | 'incidents'
  | 'users';
