import JSZip from "jszip";

function slotToCell(slot: number): string {
  if (slot < 20) return `E${slot + 10}`;
  if (slot < 40) return `H${slot - 20 + 10}`;
  return `K${slot - 40 + 10}`;
}

export async function downloadDeckExcel(
  deckName: string,
  cards: readonly { count: number; card: any }[],
) {
  const ids: string[] = [];
  for (const { card, count } of cards) {
    const id = (card as any)?.id;
    if (id) {
      for (let i = 0; i < count; i++) ids.push(id);
    }
  }
  if (ids.length !== 50) return;

  const resp = await fetch("/deck-template.xlsx");
  if (!resp.ok) throw new Error(`템플릿 파일을 불러올 수 없습니다: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  let xml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");

  for (let slot = 0; slot < 50; slot++) {
    const cellRef = slotToCell(slot);
    const value = slot > 0 && ids[slot] === ids[slot - 1] ? "〃" : ids[slot];
    xml = xml.replace(
      new RegExp(`(<c r="${cellRef}"[^>]*)/>`),
      `$1 t="inlineStr"><is><t>${value}</t></is></c>`,
    );
  }

  zip.file("xl/worksheets/sheet1.xml", xml);

  const outBuf = await zip.generateAsync({ type: "arraybuffer" });
  const blob = new Blob([outBuf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deckName}_덱리스트.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
