import type { ChecklistItem } from "../types";

const descriptions = [
  "Natpisna pločica odgovara radnom nalogu",
  "Serijski broj je upisan u zapisnik",
  "Nema vidljivih oštećenja kućišta",
  "Nema oštećenja od transporta",
  "Zaštitne maske i poklopci su na mjestu",
  "Svi vijci i matice su pritegnuti",
  "Nema labavih kabela ni cijevi",
  "Oznake i naljepnice su čitljive",
  "Smjer montaže i protoka je ispravan",
  "Spojevi su nepropusni",
  "Izolacija je cijela i neoštećena",
  "Odvod kondenzata je slobodan",
  "Krug je odzračen",
  "Tlakovi su u dozvoljenom rasponu",
  "Temperature su u dozvoljenom rasponu",
  "Sigurnosni ventil je ispravan i plombiran",
  "Električni priključak je označen",
  "Uzemljenje je izmjereno",
  "Zaštitne sklopke odgovaraju projektu",
  "Smjer vrtnje motora ili kompresora je ispravan",
  "Nema neuobičajene buke ni vibracija",
  "Funkcionalna proba je odrađena",
  "Regulacija odgovara projektu",
  "Shema odgovara izvedbi",
  "Upute su priložene",
  "Zapisnik kontrole je ispunjen",
  "Nedostaci su upisani ili ih nema",
  "Uređaj je očišćen za predaju",
  "Završna kontrola je potpisana",
  "Uređaj je označen kao ispravan ili s primjedbom",
];

export const checklistItems: ChecklistItem[] = descriptions.map((description, index) => {
  const code = `KK-${String(index + 1).padStart(2, "0")}`;
  return { id: `chk-${code.toLowerCase()}`, code, description };
});

export const checklistItemIds = checklistItems.map((item) => item.id);
