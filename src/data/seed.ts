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

  const jobRoles = [
    { id: "elektroplanimetrist", name: "Elektroplanimetrist", color: "#2563eb" },
    { id: "ispitivac", name: "Ispitivač", color: "#4f46e5" },
    { id: "limar", name: "Limar", color: "#ca8a04" },
    { id: "elektromonter", name: "Elektromonter", color: "#0284c7" },
    { id: "izolater", name: "Izolater", color: "#7c3aed" },
    { id: "cistac-uredaja", name: "Čistač uređaja", color: "#16a34a" },
    { id: "monter-konstrukcije", name: "Monter konstrukcije", color: "#78716c" },
    { id: "logisticar", name: "Logističar", color: "#65a30d" },
    { id: "savijac-bakra", name: "Savijač bakra", color: "#ea580c" },
    { id: "lemitelj-bakra", name: "Lemitelj bakra", color: "#c2410c" },
    { id: "monter-inoksa", name: "Monter inoxa", color: "#0d9488" },
    { id: "zavarivac-inoksa", name: "Zavarivač inoxa", color: "#155e75" },
    { id: "serviser", name: "Serviser", color: "#dc2626" },
    { id: "monter-v-modula", name: "Monter V-modula", color: "#db2777" },
    { id: "sortirac-lima", name: "Sortirač lima", color: "#a16207" },
  ];

  const workGroups = [
    { id: "wg-ivanovi", name: "Ivanovi ljudi" },
    { id: "wg-elektricari", name: "Električari" },
    { id: "wg-dezurstvo", name: "Dežurstvo" },
    { id: "wg-najjaci", name: "Najjači igrači" },
    { id: "wg-gornja", name: "Gornja hala" },
    { id: "wg-donja", name: "Donja hala" },
    { id: "wg-sopnica", name: "Hala Sopnica" },
  ];

  const employees = [
    { id: "emp-1", name: "Ivan Vladić", email: "ivan.vladic@plan-o.hr", roleIds: ["monter-konstrukcije"], groupIds: ["wg-ivanovi", "wg-najjaci", "wg-sopnica"] },
    { id: "emp-2", name: "Luka Majstorović", email: "luka.majstorovic@plan-o.hr", roleIds: ["monter-konstrukcije"], groupIds: ["wg-ivanovi", "wg-gornja"] },
    { id: "emp-3", name: "Mario Nikolić", email: "mario.nikolic@plan-o.hr", roleIds: ["serviser"], groupIds: ["wg-dezurstvo", "wg-gornja"] },
    { id: "emp-4", name: "Domagoj Takač", email: "domagoj.takac@plan-o.hr", roleIds: ["serviser"], groupIds: ["wg-najjaci", "wg-donja"] },
    { id: "emp-5", name: "Marko Čižmek", email: "marko.cizmek@plan-o.hr", roleIds: ["elektromonter"], groupIds: ["wg-elektricari", "wg-ivanovi", "wg-sopnica"] },
    { id: "emp-6", name: "Tomo Žižak", email: "tomo.zizak@plan-o.hr", roleIds: ["elektromonter", "monter-konstrukcije"], groupIds: ["wg-elektricari", "wg-donja"] },
    { id: "emp-7", name: "Patrik Lukanović", email: "patrik.lukanovic@plan-o.hr", roleIds: ["serviser"], groupIds: ["wg-dezurstvo", "wg-najjaci", "wg-sopnica"] },
  ].map((row) => ({ ...row, active: true }));

  const tasks = [
    { id: "task-ep-01", code: "EP-01", description: "Čitanje elektro nacrta", role: "elektroplanimetrist" },
    { id: "task-ep-02", code: "EP-02", description: "Označavanje kabela", role: "elektroplanimetrist" },
    { id: "task-ep-03", code: "EP-03", description: "Priprema kablovske dokumentacije", role: "elektroplanimetrist" },
    { id: "task-is-01", code: "IS-01", description: "Funkcionalni test uređaja", role: "ispitivac" },
    { id: "task-is-02", code: "IS-02", description: "Ispitivanje električnih veza", role: "ispitivac" },
    { id: "task-is-03", code: "IS-03", description: "Izrada zapisnika ispitivanja", role: "ispitivac" },
    { id: "task-lm-01", code: "LM-01", description: "Rezanje limenih dijelova", role: "limar" },
    { id: "task-lm-02", code: "LM-02", description: "Savijanje lima", role: "limar" },
    { id: "task-lm-03", code: "LM-03", description: "Izrada limenog poklopca", role: "limar" },
    { id: "task-el-01", code: "EL-01", description: "Priključak napajanja", role: "elektromonter" },
    { id: "task-el-02", code: "EL-02", description: "Ugradnja regulacije", role: "elektromonter" },
    { id: "task-el-03", code: "EL-03", description: "Povezivanje BMS-a", role: "elektromonter" },
    { id: "task-iz-01", code: "IZ-01", description: "Izolacija cjevovoda", role: "izolater" },
    { id: "task-iz-02", code: "IZ-02", description: "Izolacija kućišta", role: "izolater" },
    { id: "task-iz-03", code: "IZ-03", description: "Brtvljenje spojeva izolacije", role: "izolater" },
    { id: "task-cu-01", code: "CU-01", description: "Čišćenje izmjenjivača", role: "cistac-uredaja" },
    { id: "task-cu-02", code: "CU-02", description: "Čišćenje kućišta", role: "cistac-uredaja" },
    { id: "task-cu-03", code: "CU-03", description: "Priprema uređaja za otpremu", role: "cistac-uredaja" },
    { id: "task-mk-01", code: "MK-01", description: "Montaža nosača", role: "monter-konstrukcije" },
    { id: "task-mk-02", code: "MK-02", description: "Sastavljanje okvira", role: "monter-konstrukcije" },
    { id: "task-mk-03", code: "MK-03", description: "Postavljanje kućišta", role: "monter-konstrukcije" },
    { id: "task-lg-01", code: "LG-01", description: "Priprema materijala", role: "logisticar" },
    { id: "task-lg-02", code: "LG-02", description: "Izdavanje dijelova", role: "logisticar" },
    { id: "task-lg-03", code: "LG-03", description: "Pakiranje za otpremu", role: "logisticar" },
    { id: "task-sb-01", code: "SB-01", description: "Savijanje bakrenih cijevi", role: "savijac-bakra" },
    { id: "task-sb-02", code: "SB-02", description: "Priprema bakrenih navoja", role: "savijac-bakra" },
    { id: "task-sb-03", code: "SB-03", description: "Povlačenje bakrenih cijevi", role: "savijac-bakra" },
    { id: "task-lb-01", code: "LB-01", description: "Lemljenje bakrenih spojeva", role: "lemitelj-bakra" },
    { id: "task-lb-02", code: "LB-02", description: "Lemljenje priključaka", role: "lemitelj-bakra" },
    { id: "task-lb-03", code: "LB-03", description: "Kontrola lemljenih spojeva", role: "lemitelj-bakra" },
    { id: "task-mi-01", code: "MI-01", description: "Montaža inox cjevovoda", role: "monter-inoksa" },
    { id: "task-mi-02", code: "MI-02", description: "Montaža inox priključaka", role: "monter-inoksa" },
    { id: "task-mi-03", code: "MI-03", description: "Poravnavanje inox elemenata", role: "monter-inoksa" },
    { id: "task-zi-01", code: "ZI-01", description: "Zavarivanje inox cijevi", role: "zavarivac-inoksa" },
    { id: "task-zi-02", code: "ZI-02", description: "Zavarivanje prirobnica", role: "zavarivac-inoksa" },
    { id: "task-zi-03", code: "ZI-03", description: "Brušenje inox zavara", role: "zavarivac-inoksa" },
    { id: "task-sv-01", code: "SV-01", description: "Vakuumiranje kruga", role: "serviser" },
    { id: "task-sv-02", code: "SV-02", description: "Punjenje rashladnog sredstva", role: "serviser" },
    { id: "task-sv-03", code: "SV-03", description: "Dijagnostika kvara", role: "serviser" },
    { id: "task-vm-01", code: "VM-01", description: "Montaža V-modula", role: "monter-v-modula" },
    { id: "task-vm-02", code: "VM-02", description: "Spajanje V-modula na krug", role: "monter-v-modula" },
    { id: "task-vm-03", code: "VM-03", description: "Provjera V-modula", role: "monter-v-modula" },
    { id: "task-sl-01", code: "SL-01", description: "Sortiranje limenih dijelova", role: "sortirac-lima" },
    { id: "task-sl-02", code: "SL-02", description: "Označavanje limova", role: "sortirac-lima" },
    { id: "task-sl-03", code: "SL-03", description: "Priprema kompleta lima", role: "sortirac-lima" },
  ];
  const allTaskIds = tasks.map((task) => task.id);

  const workOrderTemplates = [
    { id: "tpl-co2", name: "CO2", color: "#ea580c", taskIds: [...allTaskIds] },
    { id: "tpl-ciler", name: "Čiler", color: "#dc2626", taskIds: [...allTaskIds] },
    { id: "tpl-dizalica", name: "Dizalica topline", color: "#7c3aed", taskIds: [...allTaskIds] },
    { id: "tpl-pumpa", name: "Pumpa", color: "#16a34a", taskIds: [...allTaskIds] },
    { id: "tpl-ormar", name: "Razvodni ormar", color: "#2563eb", taskIds: [...allTaskIds] },
    { id: "tpl-hidraulika", name: "Hidraulika", color: "#ca8a04", taskIds: [...allTaskIds] },
  ];

  const workOrders: WorkOrder[] = [
    {
      id: "wo-ro-01",
      code: "RN-01",
      name: "Razvodni ormarić",
      description: "Ugradnja i ožičenje razvodnog ormarića za čiler ili dizalicu topline.",
      color: "#2563eb",
      templateId: "tpl-ormar",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-pc-01",
      code: "RN-02",
      name: "Pumpa čilera",
      description: "Montaža i servis cirkulacijske pumpe na krugu čilera.",
      color: "#16a34a",
      templateId: "tpl-pumpa",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-vj-01",
      code: "RN-03",
      name: "Vanjska jedinica",
      description: "Postavljanje vanjske jedinice dizalice topline.",
      color: "#ea580c",
      templateId: "tpl-co2",
      status: "otvoren",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-hm-01",
      code: "RN-04",
      name: "Hidraulički modul",
      description: "Spoj hidrauličkog modula, ventila i cjevovoda.",
      color: "#ca8a04",
      templateId: "tpl-hidraulika",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-kc-01",
      code: "RN-05",
      name: "Kondenzator čilera",
      description: "Rad na kondenzatorskoj jedinici rashladnog agregata.",
      color: "#dc2626",
      templateId: "tpl-ciler",
      status: "otvoren",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-ep-01",
      code: "RN-06",
      name: "Ekspanzijska posuda",
      description: "Ugradnja i provjera ekspanzijske posude na hidrauličkom krugu.",
      color: "#ca8a04",
      templateId: "tpl-hidraulika",
      status: "zavrsen",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-fs-01",
      code: "RN-07",
      name: "Filter-sušač",
      description: "Zamjena filter-sušača u rashladnom krugu.",
      color: "#dc2626",
      templateId: "tpl-ciler",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-uj-01",
      code: "RN-08",
      name: "Unutarnja jedinica",
      description: "Montaža unutarnje jedinice dizalice topline.",
      color: "#7c3aed",
      templateId: "tpl-dizalica",
      status: "otvoren",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-ix-01",
      code: "RN-09",
      name: "Izmjenjivač topline",
      description: "Servis pločastog izmjenjivača na čileru ili dizalici.",
      color: "#dc2626",
      templateId: "tpl-ciler",
      status: "zavrsen",
      archived: true,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-fx-01",
      code: "RN-10",
      name: "Flexi P8",
      description: "CO2 jedinica, ista boja na planu kao ostali CO2 nalozi.",
      color: "#ea580c",
      templateId: "tpl-co2",
      status: "otvoren",
      archived: false,
      taskIds: [...allTaskIds],
    },
  ];

  const assignments: Assignment[] = [
    ...plan("emp-1", dateKey, "asg-t-emp1", [
      { workOrderId: "wo-pc-01", taskId: "task-mk-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-mk-03", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-mk-03", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-2", dateKey, "asg-t-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-mk-02", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-mk-03", startHour: 10, durationHours: 4 },
    ]),
    ...plan("emp-3", dateKey, "asg-t-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-sv-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-sv-02", startHour: 11, durationHours: 4 },
    ]),
    ...plan("emp-4", dateKey, "asg-t-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-sv-03", startHour: 6, durationHours: 4 },
      { workOrderId: "wo-hm-01", taskId: "task-sv-03", startHour: 10, durationHours: 5 },
    ]),
    ...plan("emp-5", dateKey, "asg-t-emp5", [
      { workOrderId: "wo-pc-01", taskId: "task-el-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-el-02", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-el-03", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-7", dateKey, "asg-t-emp7", [
      { workOrderId: "wo-vj-01", taskId: "task-sv-03", startHour: 8, durationHours: 4 },
      { workOrderId: "wo-ro-01", taskId: "task-sv-01", startHour: 12, durationHours: 4 },
    ]),

    ...plan("emp-1", prev1, "asg-p1-emp1", [
      { workOrderId: "wo-pc-01", taskId: "task-mk-01", startHour: 7, durationHours: 8 },
    ]),
    ...plan("emp-2", prev1, "asg-p1-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-mk-02", startHour: 6, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-mk-03", startHour: 10, durationHours: 4 },
    ]),
    ...plan("emp-3", prev1, "asg-p1-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-sv-01", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-sv-02", startHour: 11, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-sv-03", startHour: 14, durationHours: 2 },
    ]),
    ...plan("emp-4", prev1, "asg-p1-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-sv-03", startHour: 7, durationHours: 5 },
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
      { workOrderId: "wo-vj-01", taskId: "task-mk-02", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-mk-03", startHour: 11, durationHours: 4 },
    ], "actual"),
    ...plan("emp-3", prev1, "asg-a1-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-sv-01", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-sv-02", startHour: 11, durationHours: 2 },
      { workOrderId: "wo-fs-01", taskId: "task-sv-02", startHour: 13, durationHours: 2 },
      { workOrderId: "wo-kc-01", taskId: "task-sv-03", startHour: 15, durationHours: 2 },
    ], "actual"),

    ...plan("emp-1", prev2, "asg-p2-emp1", [
      { workOrderId: "wo-ro-01", taskId: "task-mk-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-pc-01", taskId: "task-mk-03", startHour: 11, durationHours: 2 },
      { workOrderId: "wo-kc-01", taskId: "task-mk-02", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-2", prev2, "asg-p2-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-mk-02", startHour: 8, durationHours: 8 },
    ]),
    ...plan("emp-3", prev2, "asg-p2-emp3", [
      { workOrderId: "wo-hm-01", taskId: "task-sv-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-sv-02", startHour: 10, durationHours: 5 },
    ]),
    ...plan("emp-4", prev2, "asg-p2-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-sv-03", startHour: 9, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-sv-03", startHour: 13, durationHours: 4 },
    ]),
    ...plan("emp-5", prev2, "asg-p2-emp5", [
      { workOrderId: "wo-ro-01", taskId: "task-el-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-pc-01", taskId: "task-el-02", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-el-03", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-6", prev2, "asg-p2-emp6", [
      { workOrderId: "wo-vj-01", taskId: "task-el-03", startHour: 6, durationHours: 8 },
    ]),
    ...plan("emp-7", prev2, "asg-p2-emp7", [
      { workOrderId: "wo-hm-01", taskId: "task-sv-01", startHour: 8, durationHours: 4 },
      { workOrderId: "wo-ro-01", taskId: "task-sv-03", startHour: 12, durationHours: 4 },
    ]),

    ...plan("emp-1", next1, "asg-n1-emp1", [
      { workOrderId: "wo-vj-01", taskId: "task-mk-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-uj-01", taskId: "task-mk-02", startHour: 11, durationHours: 4 },
    ]),
    ...plan("emp-1", next2, "asg-n2-emp1", [
      { workOrderId: "wo-hm-01", taskId: "task-mk-03", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-pc-01", taskId: "task-mk-03", startHour: 11, durationHours: 5 },
    ]),
    ...plan("emp-1", next3, "asg-n3-emp1", [
      { workOrderId: "wo-ro-01", taskId: "task-mk-03", startHour: 7, durationHours: 8 },
    ]),
  ];

  return {
    employees,
    tasks,
    workOrders,
    workOrderTemplates,
    workGroups,
    jobRoles,
    assignments,
    dayStatuses: [],
  };
}
