export type Role = "montazer" | "serviser" | "elektromonter";

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
  role: Role;
  groupIds: string[];
};

export type Task = {
  id: string;
  code: string;
  name: string;
  role: Role;
};

export type WorkOrderStatus = "otvoren" | "u_tijeku" | "zavrsen";

export type WorkOrder = {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
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
  workGroups: WorkGroup[];
  assignments: Assignment[];
  dayStatuses: DayStatus[];
};
