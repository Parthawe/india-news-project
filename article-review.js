const form = document.querySelector("form[data-hosted-review]");
if (form) {
  const hindi = document.documentElement.lang === "hi";
  const t = (en, hi) => hindi ? hi : en;
  const button = form.querySelector('button[type="submit"]');
  const result = document.querySelector("[data-review-result]");
  const status = document.querySelector("#main [role=status]");
  const label = button.textContent;
  const endpoint = form.dataset.hostedReview;
  const tools = document.createElement("p");
  form.after(tools);
  let current = null;
  let pollTimer;
  let activeRequest = 0;

  function add(parent, tag, text, language) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (language) {
      element.lang = language;
      element.dir = "auto";
    }
    parent.append(element);
    return element;
  }

  function linkFor(identity) {
    const url = new URL(location.href);
    url.hash = new URLSearchParams({ review: identity.id, key: identity.token }).toString();
    return url.href;
  }

  function setBusy(busy) {
    button.disabled = busy;
    button.textContent = busy ? t("Reviewing…", "समीक्षा जारी है…") : label;
    form.elements.article.disabled = busy;
    form.elements.language.disabled = busy;
  }

  function remember(identity) {
    current = identity;
    const link = linkFor(identity);
    history.replaceState(null, "", link);
    const alternate = document.querySelector(".lang-switch");
    if (alternate) alternate.hash = new URL(link).hash;
    try { localStorage.setItem("india-news-latest-review", link); } catch {}
    tools.replaceChildren();
    const savedLink = add(tools, "a", t("Private link to this saved review", "इस सहेजी गई समीक्षा का निजी लिंक"));
    savedLink.href = link;
    const note = add(tools, "span", t(" · Anyone with this link can open or delete it. ",
      " · इस लिंक से कोई भी इसे खोल या हटा सकता है। "));
    note.className = "fine";
    const remove = add(tools, "button", t("Delete saved review", "सहेजी गई समीक्षा हटाएँ"));
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!confirm(t("Delete the saved article and review?", "सहेजा गया लेख और समीक्षा हटाएँ?"))) return;
      activeRequest++;
      clearTimeout(pollTimer);
      remove.disabled = true;
      try {
        const response = await fetch(endpoint + "/" + identity.id, {
          method: "DELETE", headers: { Authorization: "Bearer " + identity.token },
        });
        if (!response.ok && response.status !== 404) throw new Error("delete");
        current = null;
        history.replaceState(null, "", location.pathname + location.search);
        const alternate = document.querySelector(".lang-switch");
        if (alternate) alternate.hash = "";
        try {
          if (localStorage.getItem("india-news-latest-review") === link) localStorage.removeItem("india-news-latest-review");
        } catch {}
        result.replaceChildren();
        tools.replaceChildren();
        status.textContent = t("Saved article and review deleted.", "सहेजा गया लेख और समीक्षा हटा दिए गए।");
        setBusy(false);
      } catch {
        status.textContent = t("Could not delete the saved review. Try again.", "समीक्षा हटाई नहीं जा सकी। फिर कोशिश करें।");
        remove.disabled = false;
      }
    });
  }

  function render(review) {
    result.replaceChildren();
    const section = add(result, "section", "");
    section.className = "section";
    add(section, "h2", t("Article review", "लेख की समीक्षा"));
    add(section, "p", t("Provisional AI review. Independent fact-checking is still needed.",
      "यह शुरुआती एआई समीक्षा है। स्वतंत्र तथ्य-जाँच अभी बाकी है।")).className = "notice";
    add(section, "p", review.summary, review.language);
    for (const [title, items] of [
      [t("Claims and their support", "दावे और उनका आधार"), review.claims],
      [t("How the story is framed", "खबर की प्रस्तुति"), review.framing],
    ]) {
      if (!items.length) continue;
      add(section, "h3", title);
      const list = add(section, "ul", "");
      for (const item of items) {
        const row = add(list, "li", "");
        add(row, "blockquote", item.quote).dir = "auto";
        add(row, "p", item.observation, review.language);
      }
    }
    if (review.questions.length) {
      add(section, "h3", t("What to check next", "आगे क्या जाँचें"));
      const list = add(section, "ul", "");
      for (const question of review.questions) add(list, "li", question, review.language);
    }
    add(section, "p", `${t("Model", "मॉडल")} · ${review.model}`);
  }

  function showRecord(record, requestNumber) {
    if (requestNumber !== activeRequest) return;
    if (record.status === "completed") {
      render(record.report);
      status.textContent = t("Review saved.", "समीक्षा सहेज दी गई।");
      setBusy(false);
      return;
    }
    if (record.status === "failed" || record.status === "limited") {
      status.textContent = record.status === "limited"
        ? t("Article saved. Today's review allowance is used up. You can retry after midnight UTC.",
          "लेख सहेज दिया गया है। आज की समीक्षा सीमा पूरी हो गई है। आधी रात UTC के बाद फिर कोशिश करें।")
        : t("Article saved. The model could not complete the review. You can retry.",
          "लेख सहेज दिया गया है। मॉडल समीक्षा पूरी नहीं कर सका। फिर कोशिश कर सकते हैं।");
      setBusy(false);
      return;
    }
    status.textContent = t("Article saved. Reviewing in the background. You can return using the private link.",
      "लेख सहेज दिया गया है। समीक्षा जारी है। निजी लिंक से बाद में लौट सकते हैं।");
    setBusy(true);
    pollTimer = setTimeout(() => loadRecord(current, requestNumber), 3000);
  }

  async function loadRecord(identity, requestNumber) {
    try {
      const response = await fetch(endpoint + "/" + identity.id, {
        headers: { Authorization: "Bearer " + identity.token },
      });
      if (requestNumber !== activeRequest) return;
      if (response.status === 404) throw new Error("missing");
      if (!response.ok) throw new Error("unavailable");
      const record = await response.json();
      current = { ...identity, article: record.article, language: record.language };
      form.elements.article.value = record.article;
      form.elements.language.value = record.language;
      showRecord(record, requestNumber);
    } catch (error) {
      if (requestNumber !== activeRequest) return;
      status.textContent = error.message === "missing"
        ? t("This private review link is invalid or the review was deleted.", "यह निजी लिंक अमान्य है या समीक्षा हटा दी गई है।")
        : t("Could not load the saved review. Open the private link again shortly.",
          "सहेजी गई समीक्षा खुल नहीं सकी। थोड़ी देर में निजी लिंक फिर खोलें।");
      setBusy(false);
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (button.disabled) return;
    clearTimeout(pollTimer);
    const requestNumber = ++activeRequest;
    const article = form.elements.article.value;
    const language = form.elements.language.value;
    if (!current || current.article !== article || current.language !== language) {
      const token = [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, "0")).join("");
      current = { id: crypto.randomUUID(), token, article, language };
    }
    // Preserve the capability locally before the network request so a lost response is recoverable.
    remember(current);
    setBusy(true);
    status.textContent = t("Saving article…", "लेख सहेजा जा रहा है…");
    result.replaceChildren();
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article, language, id: current.id, token: current.token, save: true }),
        signal: AbortSignal.timeout(20_000),
      });
      if (requestNumber !== activeRequest) return;
      if (!response.ok) {
        if (response.status === 429) throw new Error("limit");
        if (response.status === 409) throw new Error("conflict");
        throw new Error("save");
      }
      showRecord(await response.json(), requestNumber);
    } catch (error) {
      if (requestNumber !== activeRequest) return;
      status.textContent = error.message === "limit"
        ? t("Today's submission allowance is used up. Try again tomorrow.", "आज की सामग्री भेजने की सीमा पूरी हो गई है। कल फिर कोशिश करें।")
        : t("Could not confirm the save. Use the private link to check, or retry this submission.",
          "सहेजे जाने की पुष्टि नहीं हुई। निजी लिंक से जाँचें या फिर भेजें।");
      setBusy(false);
    }
  });

  function openLink() {
    clearTimeout(pollTimer);
    const params = new URLSearchParams(location.hash.slice(1));
    const id = params.get("review");
    const token = params.get("key");
    if (!/^[a-f0-9-]{36}$/.test(id || "") || !/^[a-f0-9]{64}$/.test(token || "")) return;
    current = { id, token };
    remember(current);
    const requestNumber = ++activeRequest;
    setBusy(true);
    loadRecord(current, requestNumber);
  }
  addEventListener("hashchange", openLink);
  button.disabled = false;
  if (location.hash) openLink();
  else {
    try {
      const latest = localStorage.getItem("india-news-latest-review");
      if (latest && new URL(latest).origin === location.origin) {
        add(tools, "a", t("Open your last saved review", "पिछली सहेजी गई समीक्षा खोलें")).href = latest;
      }
    } catch {}
  }
}
