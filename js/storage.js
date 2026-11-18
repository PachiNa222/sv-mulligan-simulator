(() => {
  const KEYS = { deck: "svwb-mulligan-deck-v1", opponents: "svwb-mulligan-opponents-v1" };
  window.AppStorage = {
    loadDeck() {
      try { return JSON.parse(localStorage.getItem(KEYS.deck) || "null"); } catch { return null; }
    },
    saveDeck(deck) { localStorage.setItem(KEYS.deck, JSON.stringify(deck)); },
    loadOpponents() {
      try {
        const value = JSON.parse(localStorage.getItem(KEYS.opponents) || "[]");
        return Array.isArray(value) ? value.filter(x => typeof x === "string") : [];
      } catch { return []; }
    },
    saveOpponents(names) { localStorage.setItem(KEYS.opponents, JSON.stringify(names)); }
  };
})();
