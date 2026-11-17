const form = document.querySelector("form[data-hosted-review]");
if (form) {
  const hindi = document.documentElement.lang === "hi";
  const t = (en, hi) => hindi ? hi : en;
  const button = form.querySelector('button[type="submit"]');
  const result = document.querySelector("[data-review-result]");
  const status = document.querySelector("#main [role=status]");
  const label = button.textContent;
  const errors = {
    400: t("Paste 100 to 8,000 characters of article text.", "लेख के 100 से 8,000 अक्षर पेस्ट करें।"),
    401: t("Check your review access code.", "समीक्षा का एक्सेस कोड जाँचें।"),
    429: t("The review allowance is temporarily unavailable. Try again later.", "समीक्षा की सीमा अभी पूरी हो गई है। बाद में फिर कोशिश करें।"),
  };

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

  function render(review) {
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

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (button.disabled) return;
    const { article, language, access } = form.elements;
    button.disabled = true;
    button.textContent = t("Reviewing…", "समीक्षा जारी है…");
    status.textContent = t("Reading the article…", "लेख पढ़ा जा रहा है…");
    result.replaceChildren();
    try {
      const response = await fetch(form.dataset.hostedReview, {
        method: "POST",
        headers: { Authorization: `Bearer ${access.value.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ article: article.value, language: language.value }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(String(response.status));
      render(await response.json());
      status.textContent = t("Review ready.", "समीक्षा तैयार है।");
    } catch (error) {
      status.textContent = "";
      result.replaceChildren();
      const alert = add(result, "p", errors[error.message] ??
        t("The model could not complete this review. Try again shortly.", "मॉडल समीक्षा पूरी नहीं कर सका। थोड़ी देर में फिर कोशिश करें।"));
      alert.className = "notice error";
      alert.setAttribute("role", "alert");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
  button.disabled = false;
}
