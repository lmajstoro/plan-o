export type Role = string;

export type JobRole = {
  id: string;
  name: string;
  color: string;
};

export type HourStatus = "potvrdeni" | "uredeni_i_potvrdeni" | "nisu_uneseni";

export type UserRole = "admin" | "zaposlenik";

export type SessionUser = {
  email: string;
  role: UserRole;
  name: string;
};

export type WorkGroup = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  roleIds: Role[];
  taskIds: string[];
  groupIds: string[];
  active: boolean;
  password: string;
  passwordSet: boolean;
  welcomed: boolean;
  failedLogins: number;
  locked: boolean;
  rulesAcceptedAt?: string;
  resetToken?: string;
  resetTokenExpires?: string;
  passwordResetSentAt?: string;
  lastLoginAt?: string;
};

export type Administrator = {
  id: string;
  name: string;
  email: string;
  password: string;
  failedLogins: number;
  locked: boolean;
  rulesAcceptedAt?: string;
  lastLoginAt?: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  account: string;
  email: string;
  action: string;
  target: string;
};

export type Task = {
  id: string;
  code: string;
  description: string;
  role: Role;
};

export type ChecklistItem = {
  id: string;
  code: string;
  category: string;
  description: string;
};

export type ChecklistMark = "prazno" | "potvrdeno" | "nema";

export type WorkOrderChecklistEntry = {
  itemId: string;
  mark: ChecklistMark;
};

export type WorkOrderTemplate = {
  id: string;
  name: string;
  color: string;
  taskIds: string[];
};

export type WorkOrderStatus = "otvoren" | "u_tijeku" | "zavrsen";

export type WorkOrder = {
  id: string;
  number: number;
  year: number;
  erpCode: string;
  name: string;
  displayName: string;
  customer: string;
  description: string;
  color: string;
  templateId: string;
  status: WorkOrderStatus;
  archived: boolean;
  taskIds: string[];
  checklist: WorkOrderChecklistEntry[];
};

export type AssignmentKind = "planned" | "actual";

export type Assignment = {
  id: string;
  employeeId: string;
  date: string;
  workOrderId: string;
  taskId: string;
  startHour: number;
  durationHours: number;
  kind: AssignmentKind;
};

export type DayStatus = {
  employeeId: string;
  date: string;
  status: HourStatus;
};

export type Database = {
  employees: Employee[];
  administrators: Administrator[];
  tasks: Task[];
  checklistItems: ChecklistItem[];
  workOrders: WorkOrder[];
  workOrderTemplates: WorkOrderTemplate[];
  workGroups: WorkGroup[];
  jobRoles: JobRole[];
  assignments: Assignment[];
  dayStatuses: DayStatus[];
  auditLog: AuditEntry[];
};
