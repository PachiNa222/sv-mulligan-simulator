
(() => {
  const KEYS = {
    deck: "svwb-mulligan-deck-v1",
    opponents: "svwb-mulligan-opponents-v1",
    history: "svwb-mulligan-history-v1"
  };

  const MAX_HISTORY = 5000;

  window.AppStorage = {
    loadDeck() {
      try {
        return JSON.parse(localStorage.getItem(KEYS.deck) || "null");
      } catch {
        return null;
      }
    },

    saveDeck(deck) {
      localStorage.setItem(KEYS.deck, JSON.stringify(deck));
    },

    loadOpponents() {
      try {
        const value = JSON.parse(localStorage.getItem(KEYS.opponents) || "[]");
        return Array.isArray(value) ? value.filter(x => typeof x === "string") : [];
      } catch {
        return [];
      }
    },

    saveOpponents(names) {
      localStorage.setItem(KEYS.opponents, JSON.stringify(names));
    },

    // マリガン履歴を読み込む
    loadHistory() {
      try {
        const value = JSON.parse(localStorage.getItem(KEYS.history) || "[]");
        return Array.isArray(value) ? value.slice(-MAX_HISTORY) : [];
      } catch {
        return [];
      }
    },

    // マリガン履歴を保存する
    saveHistory(history) {
      if (!Array.isArray(history) || history.length > MAX_HISTORY) {
        return false;
      }

      try {
        localStorage.setItem(KEYS.history, JSON.stringify(history));
        return true;
      } catch (error) {
        console.error("マリガン履歴を保存できませんでした。", error);
        return false;
      }
    },

    maxHistory: MAX_HISTORY
  };
})();
