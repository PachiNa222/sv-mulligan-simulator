(() => {
  const $ = id => document.getElementById(id);
  let savedDeck = AppStorage.loadDeck();
  let opponents = AppStorage.loadOpponents();
  let history = AppStorage.loadHistory();
  let state = null;
  let selected = new Set();
  let exchanged = false;
  let phase = "idle";

  const setupPanel = $("setupPanel");
  const cardRows = $("cardRows");

  function makeRow(name = "", count = 1) {
    const row = document.createElement("div");
    row.className = "card-row";
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.placeholder = "カード名"; nameInput.value = name;
    nameInput.setAttribute("aria-label", "カード名");
    const countInput = document.createElement("input");
    countInput.type = "number"; countInput.min = "1"; countInput.max = "40";
    countInput.step = "1"; countInput.value = count; countInput.setAttribute("aria-label", "枚数");
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "icon-button"; remove.textContent = "×";
    remove.title = "この行を削除";
    remove.addEventListener("click", () => { row.remove(); updateCount(); });
    nameInput.addEventListener("input", updateCount);
    countInput.addEventListener("input", updateCount);
    row.append(nameInput, countInput, remove);
    cardRows.append(row);
  }

  function rowsFromEditor() {
    return [...cardRows.querySelectorAll(".card-row")].map(row => ({
      name: row.children[0].value, count: row.children[1].value
    }));
  }

  function updateCount() {
    const total = rowsFromEditor().reduce((sum, row) => sum + (Number(row.count) || 0), 0);
    $("totalCount").textContent = `${total} / 40 枚`;
    $("totalCount").style.borderColor = total === 40 ? "#6d9e7b" : "";
  }

  function fillEditor(entries = []) {
    cardRows.replaceChildren();
    (entries.length ? entries : [{ name: "", count: 1 }]).forEach(e => makeRow(e.name, e.count));
    updateCount();
    $("deckMessage").textContent = "";
  }

  function showSetup(show) {
    setupPanel.classList.toggle("hidden", !show);
    if (show) {
      fillEditor(savedDeck || []);
      setupPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function saveDeck() {
    const result = DeckTools.validateRows(rowsFromEditor());
    if (!result.ok) {
      $("deckMessage").textContent = result.message;
      $("deckMessage").classList.add("error");
      return;
    }
    savedDeck = result.deck;
    AppStorage.saveDeck(savedDeck);
    $("deckMessage").classList.remove("error");
    $("deckMessage").textContent = "デッキを保存しました。";
    resetPractice();
    renderPractice();
    setTimeout(() => showSetup(false), 350);
  }

  function chooseOpponent() {
    $("opponentName").textContent = opponents.length
      ? opponents[Math.floor(Math.random() * opponents.length)] : "";
  }

  function renderOpponents() {
    const list = $("opponentList");
    list.replaceChildren();
    opponents.forEach((name, index) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = name;
      const remove = document.createElement("button");
      remove.textContent = "削除";
      remove.type = "button";
      remove.addEventListener("click", () => {
        opponents.splice(index, 1);
        AppStorage.saveOpponents(opponents);
        renderOpponents();
      });
      li.append(span, remove);
      list.append(li);
    });
  }

  function addOpponent() {
    const value = $("opponentInput").value.trim();
    if (!value) return;
    if (!opponents.includes(value)) opponents.push(value);
    AppStorage.saveOpponents(opponents);
    $("opponentInput").value = "";
    renderOpponents();
  }

  function resetPractice() {
    state = null;
    selected = new Set();
    exchanged = false;
    phase = "idle";
    $("opponentName").textContent = "";
  }

  function startPractice() {
    if (!savedDeck) {
      showSetup(true);
      return;
    }
    state = Mulligan.drawInitial(DeckTools.expandDeck(savedDeck));
    selected = new Set();
    exchanged = false;
    phase = "initial";
    chooseOpponent();
    renderPractice();
  }

  function toggleCard(id) {
    if (phase !== "initial" || exchanged) return;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    renderPractice();
  }

  function doExchange(all = false) {
    if (!state || exchanged) return;
  
    if (!all && selected.size === 0) {
      $("instruction").textContent = "交換するカードを選択してください。";
      return;
    }
  
    const ids = all
      ? new Set(state.hand.map(card => card.id))
      : new Set(selected);
  
    // 交換前の初期手札と交換対象を記録する
    const record = {
      cards: state.hand.map(card => card.name),
      mulliganed: state.hand.map(card => ids.has(card.id)),
      opponent: $("opponentName").textContent
    };
  
    // マリガン処理
    const nextState = Mulligan.exchange(state, ids);
  
    // 履歴の保存
    if (history.length >= AppStorage.maxHistory) {
      $("historyMessage").textContent =
        "保存上限に達しています。CSVをダウンロードして記録を退避してください。";
    } else {
      history.push(record);
  
      if (AppStorage.saveHistory(history)) {
        $("historyMessage").textContent = "マリガン結果を保存しました。";
      } else {
        history.pop();
        $("historyMessage").textContent =
          "保存できませんでした。ブラウザの保存容量を確認してください。";
      }
    }
  
    updateHistoryCount();
  
    state = nextState;
    selected = new Set();
    exchanged = true;
    phase = "after";
  
    renderPractice();
  }

    // 履歴の保存件数を画面に表示する
  function updateHistoryCount() {
    $("historyCount").textContent =
      `${history.length.toLocaleString("ja-JP")} / ${AppStorage.maxHistory.toLocaleString("ja-JP")} 件`;
  }
  
  // CSVのセル内に含まれるダブルクォートをエスケープする
  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }
  
  // CSVファイルをダウンロードする
  function downloadCsv() {
    if (history.length === 0) {
      $("historyMessage").textContent =
        "まだ記録がありません。マリガンを完了すると保存されます。";
      return;
    }
  
    const headers = [
      "1枚目のカード",
      "2枚目のカード",
      "3枚目のカード",
      "4枚目のカード",
      "1枚目をマリガンしたかどうか",
      "2枚目をマリガンしたかどうか",
      "3枚目をマリガンしたかどうか",
      "4枚目をマリガンしたかどうか",
      "対戦相手デッキ名"
    ];
  
    const lines = [headers.map(csvCell).join(",")];
  
    history.forEach(record => {
      const row = [
        ...(record.cards || ["", "", "", ""]).slice(0, 4),
        ...(record.mulliganed || [false, false, false, false])
          .slice(0, 4)
          .map(value => value ? "TRUE" : "FALSE"),
        record.opponent || ""
      ];
  
      lines.push(row.map(csvCell).join(","));
    });
  
    // Excelで日本語が文字化けしにくいようUTF-8 BOMを付ける
    const blob = new Blob(
      ["\uFEFF" + lines.join("\r\n")],
      { type: "text/csv;charset=utf-8;" }
    );
  
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
  
    link.href = url;
    link.download = `mulligan-history-${date}.csv`;
  
    document.body.append(link);
    link.click();
    link.remove();
  
    URL.revokeObjectURL(url);
  
    $("historyMessage").textContent =
      `${history.length.toLocaleString("ja-JP")}件の記録をCSVで出力しました。`;
  }

  // マリガン履歴をリセットする
  function resetHistory() {
    if (history.length === 0) {
      $("historyMessage").textContent = "リセットする履歴がありません。";
      return;
    }
  
    const confirmed = confirm(
      "保存されているマリガン履歴をすべて削除します。\nこの操作は取り消せません。本当に削除しますか？"
    );
  
    if (!confirmed) {
      return;
    }
  
    // localStorageの履歴を空にする
    if (AppStorage.saveHistory([])) {
      history = [];
      updateHistoryCount();
  
      $("historyMessage").textContent =
        "マリガン履歴をすべてリセットしました。";
    } else {
      $("historyMessage").textContent =
        "履歴をリセットできませんでした。";
    }
  }

  function nextHand() {
    startPractice();
  }

  function renderPractice() {
    const hand = $("hand");
    hand.replaceChildren();

    if (!state) {
      hand.innerHTML = '<div class="empty-hand">デッキを登録すると練習を開始できます。</div>';
      $("handTitle").textContent = "初期手札";
      $("phaseLabel").textContent = savedDeck ? "練習を開始できます" : "デッキ未登録";
      $("instruction").textContent = savedDeck
        ? "「初期手札を引く」を押してください。"
        : "デッキを登録すると、40枚からランダムに4枚引きます。";
      $("actionArea").replaceChildren();

      const start = document.createElement("button");
      start.className = "button button-primary";
      start.textContent = "初期手札を引く";
      start.addEventListener("click", startPractice);
      $("actionArea").append(start);
      return;
    }

    state.hand.forEach(card => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hand-card";
      button.classList.toggle("selected", selected.has(card.id));
      button.disabled = phase !== "initial";

      const cost = document.createElement("span");
      cost.className = "card-cost";
      cost.textContent = "◆";

      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = card.name;

      const label = document.createElement("span");
      label.className = "card-state";
      label.textContent = phase === "initial"
        ? (selected.has(card.id) ? "交換する" : "クリックして選択")
        : "";

      button.append(cost, name, label);
      button.addEventListener("click", () => toggleCard(card.id));
      hand.append(button);
    });

    $("handTitle").textContent = phase === "after" ? "交換後の手札" : "初期手札";
    $("phaseLabel").textContent = phase === "initial" ? "交換するカードを選択" : "交換完了";
    $("instruction").textContent = phase === "initial"
      ? "カードをクリックして交換対象を選び、「選択したカードを交換」または「4枚すべてを交換」を選んでください。"
      : "交換後の手札です。次の練習では40枚すべてから新しく抽選します。";

    const area = $("actionArea");
    area.replaceChildren();

    if (phase === "initial") {
      const partial = document.createElement("button");
      partial.className = "button button-primary";
      partial.textContent = `選択したカードを交換（${selected.size}枚）`;
      partial.disabled = selected.size === 0;
      partial.addEventListener("click", () => doExchange(false));

      const all = document.createElement("button");
      all.className = "button button-secondary";
      all.textContent = "4枚すべてを交換";
      all.addEventListener("click", () => doExchange(true));

      area.append(partial, all);
    } else {
      const next = document.createElement("button");
      next.className = "button button-primary";
      next.textContent = "次の初期手札へ";
      next.addEventListener("click", nextHand);
      area.append(next);
    }
  }

  $("addCard").addEventListener("click", () => {
    makeRow();
    updateCount();
  });

  $("clearCards").addEventListener("click", () => fillEditor());
  $("saveDeck").addEventListener("click", saveDeck);
  $("openSettings").addEventListener("click", () => showSetup(true));
  $("cancelSettings").addEventListener("click", () => showSetup(false));
  $("startPractice").addEventListener("click", startPractice);
  $("addOpponent").addEventListener("click", addOpponent);
  
  // Enterキーでは登録せず、「追加」ボタンを押したときだけ登録する
  $("opponentInput").addEventListener("keydown", e => {
    if (e.key === "Enter") e.preventDefault();
  });

  // CSVダウンロード
  $("downloadCsv").addEventListener("click", downloadCsv);
  // 履歴リセット
  $("resetHistory").addEventListener("click", resetHistory);
  $("importBulk").addEventListener("click", () => {
    try {
      const parsed = DeckTools.parseBulk($("bulkInput").value);
      if (!parsed.length) throw new Error("入力内容がありません。");
      fillEditor(parsed);
      $("deckMessage").textContent = "まとめて入力を反映しました。合計40枚になったら保存してください。";
      $("deckMessage").classList.remove("error");
    } catch (error) {
      $("deckMessage").textContent = error.message;
      $("deckMessage").classList.add("error");
    }
  });

  fillEditor(savedDeck || []);
  if (!savedDeck) showSetup(true);
  renderOpponents();
  updateHistoryCount();
  renderPractice();
})();
