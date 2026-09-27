export type Role = string;

export type JobRole = {
  id: string;
  name: string;
};

export type HourStatus = "potvrdeni" | "uredeni_i_potvrdeni" | "nisu_uneseni";

export type UserRole = "admin" | "zaposlenik";

export type SessionUser = {
  email: string;
  role: UserRole;
  name: string;
};

export type DemoAccount = SessionUser & {
  password: string;
};

export type WorkGroup = {
  id: string;
  name: string;
  color: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  roleIds: Role[];
  groupIds: string[];
};

export type Task = {
  id: string;
  code: string;
  description: string;
  role: Role;
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
  code: string;
  name: string;
  description: string;
  color: string;
  templateId: string;
  status: WorkOrderStatus;
  archived: boolean;
  taskIds: string[];
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
  tasks: Task[];
  workOrders: WorkOrder[];
  workOrderTemplates: WorkOrderTemplate[];
  workGroups: WorkGroup[];
  jobRoles: JobRole[];
  assignments: Assignment[];
  dayStatuses: DayStatus[];
};
