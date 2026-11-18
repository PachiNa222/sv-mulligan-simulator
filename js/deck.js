(() => {
  function validateRows(rows) {
    const cleaned = rows.map(r => ({ name: String(r.name || "").trim(), count: Number(r.count) }))
      .filter(r => r.name || (Number.isFinite(r.count) && r.count > 0));
    if (cleaned.some(r => !r.name)) return { ok: false, message: "カード名が空欄の行があります。" };
    if (cleaned.some(r => !Number.isInteger(r.count) || r.count < 1 || r.count > 40))
      return { ok: false, message: "枚数は1〜40の整数で入力してください。" };
    const total = cleaned.reduce((sum, r) => sum + r.count, 0);
    if (total !== 40) return { ok: false, message: `合計が${total}枚です。40枚にしてください。` };
    if (cleaned.length === 0) return { ok: false, message: "カードを入力してください。" };
    return { ok: true, deck: cleaned };
  }

  function expandDeck(entries) {
    const cards = [];
    entries.forEach((entry, entryIndex) => {
      for (let i = 0; i < entry.count; i++) {
        cards.push({ id: `${entryIndex}-${i}`, name: entry.name });
      }
    });
    return cards;
  }

  function parseBulk(text) {
    const rows = [];
    for (const [index, raw] of text.split(/\r?\n/).entries()) {
      const line = raw.trim();
      if (!line) continue;
      const parts = line.split(/[,\t，]/);
      if (parts.length < 2) throw new Error(`${index + 1}行目：カード名と枚数を「カード名,枚数」で入力してください。`);
      const name = parts.slice(0, -1).join(",").trim();
      const count = Number(parts.at(-1).trim());
      rows.push({ name, count });
    }
    return rows;
  }
  window.DeckTools = { validateRows, expandDeck, parseBulk };
})();
