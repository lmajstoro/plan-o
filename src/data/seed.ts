import { addWorkDays, formatDateKey, parseDateKey, todayWorkDate } from "../lib/dates";
import type { Assignment, Database, DemoAccount, WorkOrder } from "../types";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "ivan.vladic-administrator@gmail.com",
    password: "demo123",
    role: "admin",
    name: "Ivan Vladić",
  },
  {
    email: "ivan.vladic-zaposlenik@gmail.com",
    password: "demo123",
    role: "zaposlenik",
    name: "Ivan Vladić",
  },
];

type Slot = {
  workOrderId: string;
  taskId: string;
  startHour: number;
  durationHours: number;
};

function plan(employeeId: string, date: string, prefix: string, slots: Slot[], kind: Assignment["kind"] = "planned"): Assignment[] {
  return slots.map((slot, index) => ({
    id: `${prefix}-${index + 1}`,
    employeeId,
    date,
    kind,
    ...slot,
  }));
}

export function createSeedDatabase(dateKey = formatDateKey(todayWorkDate())): Database {
  const today = parseDateKey(dateKey);
  const prev1 = formatDateKey(addWorkDays(today, -1));
  const prev2 = formatDateKey(addWorkDays(today, -2));
  const next1 = formatDateKey(addWorkDays(today, 1));
  const next2 = formatDateKey(addWorkDays(today, 2));
  const next3 = formatDateKey(addWorkDays(today, 3));

  const workGroups = [
    { id: "wg-ivanovi", name: "Ivanovi ljudi", color: "#2563eb" },
    { id: "wg-elektricari", name: "Električari", color: "#0d9488" },
    { id: "wg-dezurstvo", name: "Dežurstvo", color: "#e11d48" },
    { id: "wg-najjaci", name: "Najjači igrači", color: "#d97706" },
    { id: "wg-gornja", name: "Gornja hala", color: "#7c3aed" },
    { id: "wg-donja", name: "Donja hala", color: "#0284c7" },
    { id: "wg-sopnica", name: "Hala Sopnica", color: "#65a30d" },
  ];

  const employees = [
    { id: "emp-1", name: "Ivan Vladić", email: "ivan.vladic@plan-o.hr", role: "montazer" as const, groupIds: ["wg-ivanovi", "wg-najjaci", "wg-sopnica"] },
    { id: "emp-2", name: "Luka Majstorović", email: "luka.majstorovic@plan-o.hr", role: "montazer" as const, groupIds: ["wg-ivanovi", "wg-gornja"] },
    { id: "emp-3", name: "Mario Nikolić", email: "mario.nikolic@plan-o.hr", role: "serviser" as const, groupIds: ["wg-dezurstvo", "wg-gornja"] },
    { id: "emp-4", name: "Domagoj Takač", email: "domagoj.takac@plan-o.hr", role: "serviser" as const, groupIds: ["wg-najjaci", "wg-donja"] },
    { id: "emp-5", name: "Marko Čižmek", email: "marko.cizmek@plan-o.hr", role: "elektromonter" as const, groupIds: ["wg-elektricari", "wg-ivanovi", "wg-sopnica"] },
    { id: "emp-6", name: "Tomo Žižak", email: "tomo.zizak@plan-o.hr", role: "elektromonter" as const, groupIds: ["wg-elektricari", "wg-donja"] },
    { id: "emp-7", name: "Patrik Lukanović", email: "patrik.lukanovic@plan-o.hr", role: "serviser" as const, groupIds: ["wg-dezurstvo", "wg-najjaci", "wg-sopnica"] },
  ];

  const tasks = [
    { id: "task-mn-01", code: "MN-01", name: "Postavljanje vanjske jedinice", role: "montazer" as const },
    { id: "task-mn-02", code: "MN-02", name: "Montaža unutarnje jedinice", role: "montazer" as const },
    { id: "task-mn-03", code: "MN-03", name: "Povlačenje bakrenih cijevi", role: "montazer" as const },
    { id: "task-mn-04", code: "MN-04", name: "Hidraulički priključak", role: "montazer" as const },
    { id: "task-sv-01", code: "SV-01", name: "Vakuumiranje kruga", role: "serviser" as const },
    { id: "task-sv-02", code: "SV-02", name: "Punjenje rashladnog sredstva", role: "serviser" as const },
    { id: "task-sv-03", code: "SV-03", name: "Dijagnostika kvara", role: "serviser" as const },
    { id: "task-sv-04", code: "SV-04", name: "Zamjena kompresora", role: "serviser" as const },
    { id: "task-el-01", code: "EL-01", name: "Priključak napajanja", role: "elektromonter" as const },
    { id: "task-el-02", code: "EL-02", name: "Ugradnja regulacije", role: "elektromonter" as const },
    { id: "task-el-03", code: "EL-03", name: "Ispitivanje električnih veza", role: "elektromonter" as const },
    { id: "task-el-04", code: "EL-04", name: "Povezivanje BMS-a", role: "elektromonter" as const },
  ];

  const workOrders: WorkOrder[] = [
    {
      id: "wo-ro-01",
      code: "RO-01",
      name: "Razvodni ormarić",
      description: "Ugradnja i ožičenje razvodnog ormarića za čiler ili dizalicu topline.",
      color: "#2563eb",
      status: "u_tijeku",
      archived: false,
      taskIds: ["task-mn-01", "task-mn-03", "task-sv-01", "task-sv-02", "task-sv-03", "task-el-01", "task-el-02", "task-el-03", "task-el-04"],
    },
    {
      id: "wo-pc-01",
      code: "PC-01",
      name: "Pumpa čilera",
      description: "Montaža i servis cirkulacijske pumpe na krugu čilera.",
      color: "#0d9488",
      status: "u_tijeku",
      archived: false,
      taskIds: ["task-mn-01", "task-mn-03", "task-mn-04", "task-sv-03", "task-sv-04", "task-el-01", "task-el-02"],
    },
    {
      id: "wo-vj-01",
      code: "VJ-01",
      name: "Vanjska jedinica",
      description: "Postavljanje vanjske jedinice dizalice topline.",
      color: "#d97706",
      status: "otvoren",
      archived: false,
      taskIds: ["task-mn-01", "task-mn-02", "task-mn-03", "task-sv-01", "task-sv-02", "task-sv-03", "task-el-01", "task-el-02", "task-el-03"],
    },
    {
      id: "wo-hm-01",
      code: "HM-01",
      name: "Hidraulički modul",
      description: "Spoj hidrauličkog modula, ventila i cjevovoda.",
      color: "#7c3aed",
      status: "u_tijeku",
      archived: false,
      taskIds: ["task-mn-03", "task-mn-04", "task-sv-01", "task-sv-02", "task-sv-04", "task-el-01"],
    },
    {
      id: "wo-kc-01",
      code: "KC-01",
      name: "Kondenzator čilera",
      description: "Rad na kondenzatorskoj jedinici rashladnog agregata.",
      color: "#e11d48",
      status: "otvoren",
      archived: false,
      taskIds: ["task-mn-02", "task-mn-03", "task-mn-04", "task-sv-02", "task-sv-03", "task-sv-04", "task-el-03", "task-el-04"],
    },
    {
      id: "wo-ep-01",
      code: "EP-01",
      name: "Ekspanzijska posuda",
      description: "Ugradnja i provjera ekspanzijske posude na hidrauličkom krugu.",
      color: "#0284c7",
      status: "zavrsen",
      archived: false,
      taskIds: ["task-mn-04", "task-sv-03", "task-el-02"],
    },
    {
      id: "wo-fs-01",
      code: "FS-01",
      name: "Filter-sušač",
      description: "Zamjena filter-sušača u rashladnom krugu.",
      color: "#4f46e5",
      status: "u_tijeku",
      archived: false,
      taskIds: ["task-sv-01", "task-sv-02"],
    },
    {
      id: "wo-uj-01",
      code: "UJ-01",
      name: "Unutarnja jedinica",
      description: "Montaža unutarnje jedinice dizalice topline.",
      color: "#c026d3",
      status: "otvoren",
      archived: false,
      taskIds: ["task-mn-02", "task-mn-03", "task-el-01"],
    },
    {
      id: "wo-ix-01",
      code: "IX-01",
      name: "Izmjenjivač topline",
      description: "Servis pločastog izmjenjivača na čileru ili dizalici.",
      color: "#ea580c",
      status: "zavrsen",
      archived: true,
      taskIds: ["task-sv-02", "task-sv-03", "task-el-04"],
    },
  ];

  const assignments: Assignment[] = [
    ...plan("emp-1", dateKey, "asg-t-emp1", [
      { workOrderId: "wo-pc-01", taskId: "task-mn-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-mn-03", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-mn-04", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-2", dateKey, "asg-t-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-mn-02", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-mn-03", startHour: 10, durationHours: 4 },
    ]),
    ...plan("emp-3", dateKey, "asg-t-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-sv-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-sv-02", startHour: 11, durationHours: 4 },
    ]),
    ...plan("emp-4", dateKey, "asg-t-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-sv-03", startHour: 6, durationHours: 4 },
      { workOrderId: "wo-hm-01", taskId: "task-sv-04", startHour: 10, durationHours: 5 },
    ]),
    ...plan("emp-5", dateKey, "asg-t-emp5", [
      { workOrderId: "wo-pc-01", taskId: "task-el-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-el-02", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-el-04", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-7", dateKey, "asg-t-emp7", [
      { workOrderId: "wo-vj-01", taskId: "task-sv-03", startHour: 8, durationHours: 4 },
      { workOrderId: "wo-ro-01", taskId: "task-sv-01", startHour: 12, durationHours: 4 },
    ]),

    ...plan("emp-1", prev1, "asg-p1-emp1", [
      { workOrderId: "wo-pc-01", taskId: "task-mn-01", startHour: 7, durationHours: 8 },
    ]),
    ...plan("emp-2", prev1, "asg-p1-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-mn-02", startHour: 6, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-mn-04", startHour: 10, durationHours: 4 },
    ]),
    ...plan("emp-3", prev1, "asg-p1-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-sv-01", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-sv-02", startHour: 11, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-sv-03", startHour: 14, durationHours: 2 },
    ]),
    ...plan("emp-4", prev1, "asg-p1-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-sv-04", startHour: 7, durationHours: 5 },
      { workOrderId: "wo-ro-01", taskId: "task-sv-02", startHour: 12, durationHours: 3 },
    ]),
    ...plan("emp-5", prev1, "asg-p1-emp5", [
      { workOrderId: "wo-hm-01", taskId: "task-el-01", startHour: 12, durationHours: 8 },
    ]),
    ...plan("emp-6", prev1, "asg-p1-emp6", [
      { workOrderId: "wo-vj-01", taskId: "task-el-02", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-el-03", startHour: 11, durationHours: 4 },
    ]),
    ...plan("emp-7", prev1, "asg-p1-emp7", [
      { workOrderId: "wo-ro-01", taskId: "task-sv-03", startHour: 7, durationHours: 8 },
    ]),

    ...plan("emp-2", prev1, "asg-a1-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-mn-02", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-mn-04", startHour: 11, durationHours: 4 },
    ], "actual"),
    ...plan("emp-3", prev1, "asg-a1-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-sv-01", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-sv-02", startHour: 11, durationHours: 2 },
      { workOrderId: "wo-fs-01", taskId: "task-sv-02", startHour: 13, durationHours: 2 },
      { workOrderId: "wo-kc-01", taskId: "task-sv-03", startHour: 15, durationHours: 2 },
    ], "actual"),

    ...plan("emp-1", prev2, "asg-p2-emp1", [
      { workOrderId: "wo-ro-01", taskId: "task-mn-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-pc-01", taskId: "task-mn-03", startHour: 11, durationHours: 2 },
      { workOrderId: "wo-kc-01", taskId: "task-mn-02", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-2", prev2, "asg-p2-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-mn-02", startHour: 8, durationHours: 8 },
    ]),
    ...plan("emp-3", prev2, "asg-p2-emp3", [
      { workOrderId: "wo-hm-01", taskId: "task-sv-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-sv-02", startHour: 10, durationHours: 5 },
    ]),
    ...plan("emp-4", prev2, "asg-p2-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-sv-03", startHour: 9, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-sv-04", startHour: 13, durationHours: 4 },
    ]),
    ...plan("emp-5", prev2, "asg-p2-emp5", [
      { workOrderId: "wo-ro-01", taskId: "task-el-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-pc-01", taskId: "task-el-02", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-el-04", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-6", prev2, "asg-p2-emp6", [
      { workOrderId: "wo-vj-01", taskId: "task-el-03", startHour: 6, durationHours: 8 },
    ]),
    ...plan("emp-7", prev2, "asg-p2-emp7", [
      { workOrderId: "wo-hm-01", taskId: "task-sv-01", startHour: 8, durationHours: 4 },
      { workOrderId: "wo-ro-01", taskId: "task-sv-03", startHour: 12, durationHours: 4 },
    ]),

    ...plan("emp-1", next1, "asg-n1-emp1", [
      { workOrderId: "wo-vj-01", taskId: "task-mn-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-uj-01", taskId: "task-mn-02", startHour: 11, durationHours: 4 },
    ]),
    ...plan("emp-1", next2, "asg-n2-emp1", [
      { workOrderId: "wo-hm-01", taskId: "task-mn-04", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-pc-01", taskId: "task-mn-03", startHour: 11, durationHours: 5 },
    ]),
    ...plan("emp-1", next3, "asg-n3-emp1", [
      { workOrderId: "wo-ro-01", taskId: "task-mn-03", startHour: 7, durationHours: 8 },
    ]),
  ];

  return {
    employees,
    tasks,
    workOrders,
    workGroups,
    assignments,
    dayStatuses: [],
  };
}
