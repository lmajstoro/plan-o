import { checklistItemIds, checklistItems } from "./checklists";
import { MOCK_ADMIN_EMAIL, MOCK_PASSWORD } from "../lib/accounts";
import { addWorkDays, formatDateKey, parseDateKey, todayWorkDate } from "../lib/dates";
import { suggestedDisplayName } from "../lib/workOrders";
import type { Assignment, Database, WorkOrder } from "../types";

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

function showcaseHours(today: Date): Assignment[] {
  const orderId = "wo-cl-01";
  const rows: Array<[number, string, string, number, number]> = [
    [10, "emp-1", "task-ko-01", 8, 8],
    [10, "emp-2", "task-ko-02", 8, 7],
    [10, "emp-6", "task-ko-03", 4, 4],
    [9, "emp-1", "task-ko-03", 8, 8],
    [9, "emp-2", "task-ko-01", 4, 5],
    [9, "emp-6", "task-ko-02", 6, 6],
    [9, "emp-3", "task-is-01", 8, 8],
    [8, "emp-3", "task-is-02", 6, 5],
    [8, "emp-4", "task-is-01", 4, 4],
    [8, "emp-1", "task-ko-02", 4, 3],
    [8, "emp-2", "task-ko-03", 8, 8],
    [7, "emp-2", "task-ko-01", 6, 6],
    [7, "emp-5", "task-er-01", 8, 8],
    [7, "emp-6", "task-em-02", 6, 7],
    [7, "emp-1", "task-ko-01", 4, 4],
    [6, "emp-5", "task-er-02", 4, 6],
    [6, "emp-6", "task-em-03", 8, 8],
    [6, "emp-7", "task-is-01", 8, 6],
    [6, "emp-2", "task-ko-02", 4, 2],
    [5, "emp-3", "task-is-01", 6, 6],
    [5, "emp-7", "task-is-02", 8, 4],
    [5, "emp-4", "task-is-03", 4, 4],
    [5, "emp-5", "task-er-03", 4, 4],
    [4, "emp-3", "task-is-02", 4, 5],
    [4, "emp-1", "task-ko-03", 4, 4],
    [4, "emp-2", "task-ko-03", 4, 3],
    [4, "emp-5", "task-er-01", 2, 2],
    [3, "emp-4", "task-is-02", 4, 2],
    [3, "emp-6", "task-em-01", 4, 4],
    [3, "emp-7", "task-is-03", 4, 0],
    [3, "emp-1", "task-ko-03", 2, 2],
    [8, "emp-8", "task-iz-01", 8, 8],
    [7, "emp-8", "task-iz-01", 6, 6],
    [6, "emp-8", "task-iz-01", 4, 4],
    [9, "emp-9", "task-ba-01", 8, 8],
    [8, "emp-9", "task-ba-02", 6, 5],
    [6, "emp-9", "task-ba-03", 4, 4],
  ];
  return rows.flatMap(([offset, employeeId, taskId, planned, actual], index) => {
    const date = formatDateKey(addWorkDays(today, -offset));
    const shared = { employeeId, date, workOrderId: orderId, taskId, startHour: 7 };
    const plannedRow: Assignment = { id: `asg-cl-p-${index + 1}`, kind: "planned", durationHours: planned, ...shared };
    if (actual <= 0) return [plannedRow];
    return [plannedRow, { id: `asg-cl-a-${index + 1}`, kind: "actual", durationHours: actual, ...shared }];
  });
}

export function createSeedDatabase(dateKey = formatDateKey(todayWorkDate())): Database {
  const today = parseDateKey(dateKey);
  const year = today.getFullYear();
  const prev1 = formatDateKey(addWorkDays(today, -1));
  const prev2 = formatDateKey(addWorkDays(today, -2));
  const next1 = formatDateKey(addWorkDays(today, 1));
  const next2 = formatDateKey(addWorkDays(today, 2));
  const next3 = formatDateKey(addWorkDays(today, 3));

  const jobRoles = [
    { id: "opcenito", name: "Općenito", color: "#78716c" },
    { id: "logistika", name: "Logistika", color: "#65a30d" },
    { id: "obrada-lima", name: "Obrada lima", color: "#a16207" },
    { id: "konstrukcija", name: "Konstrukcija", color: "#2563eb" },
    { id: "bakar-lotanje", name: "Bakar - lotanje", color: "#c2410c" },
    { id: "bakar-savijanje", name: "Bakar - savijanje", color: "#ea580c" },
    { id: "izolacija", name: "Izolacija", color: "#7c3aed" },
    { id: "inox-zavarivaci", name: "Inox - zavarivači", color: "#155e75" },
    { id: "inox-monteri", name: "Inox - monteri", color: "#0d9488" },
    { id: "v-moduli", name: "V-moduli", color: "#db2777" },
    { id: "elektroplanimetrija", name: "Elektroplanimetrija", color: "#4f46e5" },
    { id: "elektro-montaza", name: "Elektro montaža", color: "#0284c7" },
    { id: "elektro-v-moduli", name: "Elektro v moduli", color: "#9f1239" },
    { id: "ispitna-stanica", name: "Ispitna stanica", color: "#16a34a" },
    { id: "ciscenje", name: "Čišćenje", color: "#ca8a04" },
  ];

  const workGroups = [
    { id: "wg-hala-1", name: "Hala 1" },
    { id: "wg-hala-2", name: "Hala 2" },
    { id: "wg-hala-3", name: "Hala 3" },
    { id: "wg-hala-4", name: "Hala 4" },
    { id: "wg-gornja-el", name: "Gornja elek. radiona" },
    { id: "wg-sesvete", name: "Sesvete" },
  ];

  const employees = [
    { id: "emp-1", name: "Ivan Vladić", email: "ivan.vladic@plan-o.hr", roleIds: ["opcenito", "konstrukcija"], groupIds: ["wg-hala-1"] },
    { id: "emp-2", name: "Luka Majstorović", email: "luka.majstorovic@plan-o.hr", roleIds: ["opcenito", "konstrukcija"], groupIds: ["wg-hala-2"] },
    { id: "emp-3", name: "Mario Nikolić", email: "mario.nikolic@plan-o.hr", roleIds: ["opcenito", "ispitna-stanica"], groupIds: ["wg-hala-3"] },
    { id: "emp-4", name: "Domagoj Takač", email: "domagoj.takac@plan-o.hr", roleIds: ["opcenito", "ispitna-stanica"], groupIds: ["wg-hala-4"] },
    { id: "emp-5", name: "Marko Čižmek", email: "marko.cizmek@plan-o.hr", roleIds: ["opcenito", "elektroplanimetrija"], groupIds: ["wg-gornja-el"] },
    { id: "emp-6", name: "Tomo Žižak", email: "tomo.zizak@plan-o.hr", roleIds: ["opcenito", "elektro-montaza", "konstrukcija"], groupIds: ["wg-gornja-el", "wg-hala-1"] },
    { id: "emp-7", name: "Patrik Lukanović", email: "patrik.lukanovic@plan-o.hr", roleIds: ["opcenito", "ispitna-stanica"], groupIds: ["wg-sesvete"] },
    { id: "emp-8", name: "Nikola Perić", email: "nikola.peric@plan-o.hr", roleIds: ["opcenito", "izolacija"], groupIds: ["wg-hala-2"] },
    { id: "emp-9", name: "Stjepan Babić", email: "stjepan.babic@plan-o.hr", roleIds: ["opcenito", "bakar-lotanje"], groupIds: ["wg-sesvete", "wg-hala-4"] },
  ].map((row) => ({ ...row, active: true }));

  const tasks = [
    { id: "task-rp-01", code: "RP-01", description: "Redovni poslovi", role: "opcenito" },
    { id: "task-lo-01", code: "LO-01", description: "Komunikacija s kupcem ili dobavljačem", role: "logistika" },
    { id: "task-lo-02", code: "LO-02", description: "Administracija", role: "logistika" },
    { id: "task-lo-03", code: "LO-03", description: "Izrada skladišnih dokumenata", role: "logistika" },
    { id: "task-lo-04", code: "LO-04", description: "Organizacija transporta", role: "logistika" },
    { id: "task-lo-05", code: "LO-05", description: "Transport robe", role: "logistika" },
    { id: "task-lo-06", code: "LO-06", description: "Kontrola robe - ulaz/povrat", role: "logistika" },
    { id: "task-lo-07", code: "LO-07", description: "Slaganje robe za radni nalog", role: "logistika" },
    { id: "task-lo-08", code: "LO-08", description: "Slaganje robe za kanban", role: "logistika" },
    { id: "task-li-01", code: "LI-01", description: "Probijanje lima na probijačici ili rezanje laserom", role: "obrada-lima" },
    { id: "task-li-02", code: "LI-02", description: "Savijanje lima na savijačici", role: "obrada-lima" },
    { id: "task-li-03", code: "LI-03", description: "Plastificiranje lima", role: "obrada-lima" },
    { id: "task-li-04", code: "LI-04", description: "Servis strojeva", role: "obrada-lima" },
    { id: "task-li-05", code: "LI-05", description: "Transport lima", role: "obrada-lima" },
    { id: "task-li-06", code: "LI-06", description: "Zavarivanje vijaka", role: "obrada-lima" },
    { id: "task-li-07", code: "LI-07", description: "Piljenje aluminija", role: "obrada-lima" },
    { id: "task-li-08", code: "LI-08", description: "Razvrstavanje lima", role: "obrada-lima" },
    { id: "task-li-09", code: "LI-09", description: "Sklapanje postolja", role: "obrada-lima" },
    { id: "task-li-10", code: "LI-10", description: "Postavljanje zvučne izolacije", role: "obrada-lima" },
    { id: "task-li-11", code: "LI-11", description: "Montaža bravica na panele", role: "obrada-lima" },
    { id: "task-li-12", code: "LI-12", description: "Izrada kalupa", role: "obrada-lima" },
    { id: "task-ko-01", code: "KO-01", description: "Sastavljanje bazne konstrukcije i montiranje osnovnih komponenata", role: "konstrukcija" },
    { id: "task-ko-02", code: "KO-02", description: "Poklapanje kompresorskog prostora i montaža V-modula", role: "konstrukcija" },
    { id: "task-ko-03", code: "KO-03", description: "Utovar", role: "konstrukcija" },
    { id: "task-ko-04", code: "KO-04", description: "Razvrstavanje limova", role: "konstrukcija" },
    { id: "task-ko-05", code: "KO-05", description: "Izrada kalupa", role: "konstrukcija" },
    { id: "task-ba-01", code: "BA-01", description: "Priprema pločastih izmjenjivača i lemljenje ekspanzijskog ventila", role: "bakar-lotanje" },
    { id: "task-ba-02", code: "BA-02", description: "Izrada bakrenih cjevovoda u kompresorskom prostoru i interna tlačna proba", role: "bakar-lotanje" },
    { id: "task-ba-03", code: "BA-03", description: "Spajanje cjevovoda kompresorskog dijela i V-modula", role: "bakar-lotanje" },
    { id: "task-sp-01", code: "SP-01", description: "Setiranje i plombiranje presostata te ispunjavanje obrazaca", role: "bakar-lotanje" },
    { id: "task-tp-01", code: "TP-01", description: "Tlačna proba, vakuumiranje i ispunjavanje obrazaca", role: "bakar-lotanje" },
    { id: "task-ba-04", code: "BA-04", description: "Savijanje bakrenih cijevi", role: "bakar-savijanje" },
    { id: "task-iz-01", code: "IZ-01", description: "Postavljanje izolacije i dodatni radovi", role: "izolacija" },
    { id: "task-in-01", code: "IN-01", description: "Izrada usisnog cjevovoda", role: "inox-zavarivaci" },
    { id: "task-in-02", code: "IN-02", description: "Izrada vodenog dijela", role: "inox-zavarivaci" },
    { id: "task-in-03", code: "IN-03", description: "Montaža inox cijevi, izrada bakrenog vodenog dijela", role: "inox-monteri" },
    { id: "task-vm-01", code: "VM-01", description: "Sklapanje V-modula i interna tlačna proba", role: "v-moduli" },
    { id: "task-er-01", code: "ER-01", description: "Planimetrija", role: "elektroplanimetrija" },
    { id: "task-er-02", code: "ER-02", description: "Spajanje elektro ormara", role: "elektroplanimetrija" },
    { id: "task-er-03", code: "ER-03", description: "Kontrola kvalitete elektroormara", role: "elektroplanimetrija" },
    { id: "task-er-04", code: "ER-04", description: "Priprema vrata", role: "elektroplanimetrija" },
    { id: "task-er-05", code: "ER-05", description: "Kalupiranje ormara", role: "elektroplanimetrija" },
    { id: "task-em-01", code: "EM-01", description: "Ožičavanje kompresorskog dijela", role: "elektro-montaza" },
    { id: "task-em-02", code: "EM-02", description: "Montiranje kanala i provlačenje kablova do ormara", role: "elektro-montaza" },
    { id: "task-em-03", code: "EM-03", description: "Spajanje kablova u ormaru", role: "elektro-montaza" },
    { id: "task-em-04", code: "EM-04", description: "Spajanje temperaturnih sondi i presostata", role: "elektro-montaza" },
    { id: "task-es-01", code: "ES-01", description: "Montaža i spajanje ventilatora", role: "elektro-v-moduli" },
    { id: "task-is-01", code: "IS-01", description: "Naknadne izmjene električari", role: "ispitna-stanica" },
    { id: "task-is-02", code: "IS-02", description: "Naknadne izmjene strojari", role: "ispitna-stanica" },
    { id: "task-is-03", code: "IS-03", description: "Ispitivanje uređaja", role: "ispitna-stanica" },
    { id: "task-za-01", code: "ZA-01", description: "Zastoj u radu", role: "opcenito" },
    { id: "task-ci-01", code: "CI-01", description: "Čišćenje i priprema uređaja za isporuku", role: "ciscenje" },
  ];
  const allTaskIds = tasks.map((task) => task.id);

  const workOrderTemplates = [
    { id: "tpl-compact", name: "COMPACT", color: "#2563eb" },
    { id: "tpl-compas", name: "COMPAS", color: "#dc2626" },
    { id: "tpl-flexy", name: "FLEXY", color: "#16a34a" },
    { id: "tpl-flexy-hp", name: "FLEXY HP", color: "#ca8a04" },
    { id: "tpl-flipper", name: "FLIPPER", color: "#ea580c" },
    { id: "tpl-freecooling", name: "FREECOOLING MODULE", color: "#0d9488" },
    { id: "tpl-fxp", name: "FXP", color: "#7c3aed" },
    { id: "tpl-hydromodule", name: "HYDROMODULE", color: "#9f1239" },
    { id: "tpl-maxiline", name: "MAXILINE", color: "#0284c7" },
    { id: "tpl-midis", name: "MIDIS", color: "#4f46e5" },
    { id: "tpl-midline", name: "MIDLINE", color: "#65a30d" },
    { id: "tpl-midline-hp", name: "MIDLINE HP", color: "#c2410c" },
    { id: "tpl-miniline", name: "MINILINE", color: "#155e75" },
    { id: "tpl-miniline-hp", name: "MINILINE HP", color: "#78716c" },
    { id: "tpl-minis", name: "MINIS", color: "#db2777" },
  ].map((template) => ({ ...template, taskIds: [...allTaskIds] }));

  const workOrders: WorkOrder[] = ([
    {
      id: "wo-ro-01",
      number: 1,
      year,
      erpCode: "KT4821AX",
      name: "MINILINE(K-1)(630EC 1PH-1)(Q5-25.1AXH-1)",
      description: "Ugradnja i ožičenje razvodnog ormarića za čiler ili dizalicu topline.\n\n- [x] Provjeri napon na mjestu\n- [ ] Pripremi nosače\n- [ ] Spoji kabele",
      color: "#2563eb",
      templateId: "tpl-miniline",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-pc-01",
      number: 2,
      year,
      erpCode: "PC7305LM",
      name: "MIDLINE HP(L-4)(910EC-2)(S15-52AXH HT-2)",
      description: "Montaža i servis cirkulacijske pumpe na krugu čilera.\n\n- [ ] Isklopi pumpu\n- [ ] Zamijeni brtvu\n- [ ] Testiraj protok",
      color: "#16a34a",
      templateId: "tpl-midline-hp",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-vj-01",
      number: 3,
      year,
      erpCode: "VJ2196RT",
      name: "TOPDUAL(V30-84AXH-2)",
      description: "Postavljanje vanjske jedinice dizalice topline.",
      color: "#ea580c",
      templateId: "tpl-flexy",
      status: "otvoren",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-hm-01",
      number: 4,
      year,
      erpCode: "HM5540ZD",
      name: "COMPACT(P-2)(910EC-2)(S12-42AXH-2)",
      description: "Spoj hidrauličkog modula, ventila i cjevovoda.",
      color: "#ca8a04",
      templateId: "tpl-compact",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-kc-01",
      number: 5,
      year,
      erpCode: "KC8812PB",
      name: "FLEXY(P-4)(910EC-4)(V30-84AXH-2)",
      description: "Rad na kondenzatorskoj jedinici rashladnog agregata.",
      color: "#dc2626",
      templateId: "tpl-flexy",
      status: "otvoren",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-ep-01",
      number: 6,
      year,
      erpCode: "EP3307WN",
      name: "MINILINE(L-2)(910EC-1)(S7-33.1AXH-1)R290",
      description: "Ugradnja i provjera ekspanzijske posude na hidrauličkom krugu.",
      color: "#ca8a04",
      templateId: "tpl-miniline",
      status: "zavrsen",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-fs-01",
      number: 7,
      year,
      erpCode: "FS6623QK",
      name: "NANOWONE(Q7-33.1AXH-1)",
      description: "Zamjena filter-sušača u rashladnom krugu.",
      color: "#dc2626",
      templateId: "tpl-compact",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-uj-01",
      number: 8,
      year,
      erpCode: "UJ4478HV",
      name: "TOPDUAL(V35-103AXH-2)",
      description: "Montaža unutarnje jedinice dizalice topline.",
      color: "#7c3aed",
      templateId: "tpl-flexy-hp",
      status: "otvoren",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-ix-01",
      number: 9,
      year,
      erpCode: "IX1954CE",
      name: "MINILINE(L-1)(800EC-1)(Q7-36.1AXH-1)",
      description: "Servis pločastog izmjenjivača na čileru ili dizalici.",
      color: "#dc2626",
      templateId: "tpl-miniline",
      status: "zavrsen",
      archived: true,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-fx-01",
      number: 10,
      year,
      erpCode: "FX9037TS",
      name: "TOPDUAL(S12-42AXHT-2)",
      description: "CO2 jedinica, ista boja na planu kao ostali CO2 nalozi.",
      color: "#ea580c",
      templateId: "tpl-flexy",
      status: "otvoren",
      archived: false,
      taskIds: [...allTaskIds],
    },
    {
      id: "wo-cl-01",
      number: 11,
      year,
      erpCode: "CL1208KW",
      name: "HYDROMODUL",
      description: "Sklapanje čilera za halu 2. Rad traje dva tjedna, od konstrukcije do čišćenja.",
      color: "#dc2626",
      templateId: "tpl-hydromodule",
      status: "u_tijeku",
      archived: false,
      taskIds: [...allTaskIds],
    },
  ] satisfies Array<Omit<WorkOrder, "checklist" | "customer" | "displayName">>).map((order, index) => ({
    ...order,
    customer: ["secon", "coolmark", "abk", "a-comfort", "a2p"][index % 5],
    displayName: suggestedDisplayName(order.name),
    checklist: checklistItemIds.map((itemId, index) => ({
      itemId,
      mark: order.id !== "wo-cl-01" ? "prazno" as const : index < 12 ? "potvrdeno" as const : index === 17 ? "nema" as const : "prazno" as const,
    })),
  }));

  const assignments: Assignment[] = [
    ...plan("emp-1", dateKey, "asg-t-emp1", [
      { workOrderId: "wo-pc-01", taskId: "task-ko-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-ko-03", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-ko-03", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-2", dateKey, "asg-t-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-ko-02", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-ko-03", startHour: 10, durationHours: 4 },
    ]),
    ...plan("emp-3", dateKey, "asg-t-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-is-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-is-02", startHour: 11, durationHours: 4 },
    ]),
    ...plan("emp-4", dateKey, "asg-t-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-is-03", startHour: 6, durationHours: 4 },
      { workOrderId: "wo-hm-01", taskId: "task-is-03", startHour: 10, durationHours: 5 },
    ]),
    ...plan("emp-5", dateKey, "asg-t-emp5", [
      { workOrderId: "wo-pc-01", taskId: "task-er-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-er-02", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-er-03", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-7", dateKey, "asg-t-emp7", [
      { workOrderId: "wo-vj-01", taskId: "task-is-03", startHour: 8, durationHours: 4 },
      { workOrderId: "wo-ro-01", taskId: "task-is-01", startHour: 12, durationHours: 4 },
    ]),

    ...plan("emp-1", prev1, "asg-p1-emp1", [
      { workOrderId: "wo-pc-01", taskId: "task-ko-01", startHour: 7, durationHours: 8 },
    ]),
    ...plan("emp-2", prev1, "asg-p1-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-ko-02", startHour: 6, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-ko-03", startHour: 10, durationHours: 4 },
    ]),
    ...plan("emp-3", prev1, "asg-p1-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-is-01", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-is-02", startHour: 11, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-is-03", startHour: 14, durationHours: 2 },
    ]),
    ...plan("emp-4", prev1, "asg-p1-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-is-03", startHour: 7, durationHours: 5 },
      { workOrderId: "wo-ro-01", taskId: "task-is-02", startHour: 12, durationHours: 3 },
    ]),
    ...plan("emp-5", prev1, "asg-p1-emp5", [
      { workOrderId: "wo-hm-01", taskId: "task-er-01", startHour: 12, durationHours: 8 },
    ]),
    ...plan("emp-6", prev1, "asg-p1-emp6", [
      { workOrderId: "wo-vj-01", taskId: "task-em-02", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-em-03", startHour: 11, durationHours: 4 },
    ]),
    ...plan("emp-7", prev1, "asg-p1-emp7", [
      { workOrderId: "wo-ro-01", taskId: "task-is-03", startHour: 7, durationHours: 8 },
    ]),

    ...plan("emp-2", prev1, "asg-a1-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-ko-02", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-ko-03", startHour: 11, durationHours: 4 },
    ], "actual"),
    ...plan("emp-3", prev1, "asg-a1-emp3", [
      { workOrderId: "wo-ro-01", taskId: "task-is-01", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-hm-01", taskId: "task-is-02", startHour: 11, durationHours: 2 },
      { workOrderId: "wo-fs-01", taskId: "task-is-02", startHour: 13, durationHours: 2 },
      { workOrderId: "wo-kc-01", taskId: "task-is-03", startHour: 15, durationHours: 2 },
    ], "actual"),

    ...plan("emp-1", prev2, "asg-p2-emp1", [
      { workOrderId: "wo-ro-01", taskId: "task-ko-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-pc-01", taskId: "task-ko-03", startHour: 11, durationHours: 2 },
      { workOrderId: "wo-kc-01", taskId: "task-ko-02", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-2", prev2, "asg-p2-emp2", [
      { workOrderId: "wo-vj-01", taskId: "task-ko-02", startHour: 8, durationHours: 8 },
    ]),
    ...plan("emp-3", prev2, "asg-p2-emp3", [
      { workOrderId: "wo-hm-01", taskId: "task-is-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-ro-01", taskId: "task-is-02", startHour: 10, durationHours: 5 },
    ]),
    ...plan("emp-4", prev2, "asg-p2-emp4", [
      { workOrderId: "wo-pc-01", taskId: "task-is-03", startHour: 9, durationHours: 4 },
      { workOrderId: "wo-kc-01", taskId: "task-is-03", startHour: 13, durationHours: 4 },
    ]),
    ...plan("emp-5", prev2, "asg-p2-emp5", [
      { workOrderId: "wo-ro-01", taskId: "task-er-01", startHour: 7, durationHours: 3 },
      { workOrderId: "wo-pc-01", taskId: "task-er-02", startHour: 10, durationHours: 3 },
      { workOrderId: "wo-kc-01", taskId: "task-er-03", startHour: 13, durationHours: 2 },
    ]),
    ...plan("emp-6", prev2, "asg-p2-emp6", [
      { workOrderId: "wo-vj-01", taskId: "task-em-03", startHour: 6, durationHours: 8 },
    ]),
    ...plan("emp-7", prev2, "asg-p2-emp7", [
      { workOrderId: "wo-hm-01", taskId: "task-is-01", startHour: 8, durationHours: 4 },
      { workOrderId: "wo-ro-01", taskId: "task-is-03", startHour: 12, durationHours: 4 },
    ]),

    ...plan("emp-1", next1, "asg-n1-emp1", [
      { workOrderId: "wo-vj-01", taskId: "task-ko-01", startHour: 7, durationHours: 4 },
      { workOrderId: "wo-uj-01", taskId: "task-ko-02", startHour: 11, durationHours: 4 },
    ]),
    ...plan("emp-1", next2, "asg-n2-emp1", [
      { workOrderId: "wo-hm-01", taskId: "task-ko-03", startHour: 8, durationHours: 3 },
      { workOrderId: "wo-pc-01", taskId: "task-ko-03", startHour: 11, durationHours: 5 },
    ]),
    ...plan("emp-1", next3, "asg-n3-emp1", [
      { workOrderId: "wo-ro-01", taskId: "task-ko-03", startHour: 7, durationHours: 8 },
    ]),
    ...showcaseHours(today),
  ];

  const readyAt = "2026-01-01T08:00:00.000Z";
  return {
    employees: employees.map((row) => ({
      ...row,
      active: true,
      password: MOCK_PASSWORD,
      passwordSet: true,
      welcomed: true,
      failedLogins: 0,
      locked: false,
      rulesAcceptedAt: readyAt,
      taskIds: [],
    })),
    administrators: [
      {
        id: "adm-1",
        name: "Ivan Vladić",
        email: MOCK_ADMIN_EMAIL,
        password: MOCK_PASSWORD,
        failedLogins: 0,
        locked: false,
        rulesAcceptedAt: readyAt,
      },
    ],
    tasks,
    checklistItems,
    workOrders,
    workOrderTemplates,
    workGroups,
    jobRoles,
    assignments,
    dayStatuses: [],
    auditLog: [],
  };
}
