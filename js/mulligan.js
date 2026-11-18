(() => {
  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function drawInitial(deck) {
    const shuffled = shuffle(deck);
    return { hand: shuffled.slice(0, 4), remaining: shuffled.slice(4) };
  }

  // 初期手札の4枚はすべてremainingに含めない。交換カードだけを残り山札から補充する。
  function exchange(state, selectedIds) {
    const count = selectedIds.size;
    const replacements = shuffle(state.remaining).slice(0, count);
    const kept = state.hand.filter(card => !selectedIds.has(card.id));
    return { hand: [...kept, ...replacements], remaining: state.remaining.filter(
      card => !replacements.some(replacement => replacement.id === card.id)
    ) };
  }

  window.Mulligan = { shuffle, drawInitial, exchange };
})();
