(() => {
const mounted = new WeakMap();
function mount(root = document) {
  const form = root.querySelector("form[data-hosted-review]");
  if (!form) return () => {};
  if (mounted.has(form)) return mounted.get(form);
  const hindi = (form.dataset.language || document.documentElement.lang) === "hi";
  const t = (en, hi) => hindi ? hi : en;
  const button = form.querySelector('button[type="submit"]');
  const result = root.querySelector("[data-review-result]");
  const status = root.querySelector("[data-review-status]") || root.querySelector("#main [role=status]");
  const label = button.textContent;
  const endpoint = form.dataset.hostedReview;
  const question = root.querySelector("[data-review-question]");
  const coveragePanel = document.createElement("div");
  coveragePanel.dataset.reviewCoverage = "";
  result.after(coveragePanel);
  const blindspotPanel = document.createElement("div");
  blindspotPanel.dataset.reviewBlindspots = "";
  coveragePanel.before(blindspotPanel);
  const tools = document.createElement("p");
  tools.className = "review-saved-tools";
  form.before(status);
  form.after(tools);
  let current = null;
  let pollTimer;
  let activeRequest = 0;
  let disposed = false;
  const languageLink = document.querySelector(".lang-switch");
  function switchLanguage(event) {
    if (current && languageLink?.hash) {
      event.preventDefault();
      event.stopPropagation();
      location.assign(languageLink.href);
    }
  }
  languageLink?.addEventListener("click", switchLanguage, true);

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
    form.elements.url.disabled = busy;
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
        if (disposed) return;
        current = null;
        history.replaceState(null, "", location.pathname + location.search);
        const alternate = document.querySelector(".lang-switch");
        if (alternate) alternate.hash = "";
        try {
          if (localStorage.getItem("india-news-latest-review") === link) localStorage.removeItem("india-news-latest-review");
        } catch {}
        result.replaceChildren();
        question.replaceChildren();
        coveragePanel.replaceChildren();
        blindspotPanel.replaceChildren();
        tools.replaceChildren();
        status.textContent = t("Saved article and review deleted.", "सहेजा गया लेख और समीक्षा हटा दिए गए।");
        setBusy(false);
      } catch {
        status.textContent = t("Could not delete the saved review. Try again.", "समीक्षा हटाई नहीं जा सकी। फिर कोशिश करें।");
        remove.disabled = false;
      }
    });
  }

  function showQuestion(record) {
    question.replaceChildren();
    if (!record.url && !record.article) return;
    const bubble = add(question, "div", "");
    bubble.className = "review-message review-user";
    add(bubble, "p", t("You", "आप")).className = "review-role";
    if (record.url) {
      const link = add(bubble, "a", record.title || record.url);
      link.href = record.url;
      link.target = "_blank";
      link.rel = "noreferrer";
    } else add(bubble, "p", record.article.slice(0, 350) + (record.article.length > 350 ? "…" : ""));
  }

  function framingCard(section, review) {
    const finding = review.politicalFraming;
    const card = add(section, "section", "");
    card.className = "review-framing";
    add(card, "h3", t("Political framing", "राजनीतिक प्रस्तुति"));
    const labels = {
      "left-leaning": t("Left-leaning framing", "वामपंथी प्रस्तुति"),
      "centrist-framing": t("Centrist framing", "मध्यमार्गी प्रस्तुति"),
      "right-leaning": t("Right-leaning framing", "दक्षिणपंथी प्रस्तुति"),
      mixed: t("Mixed framing", "मिश्रित प्रस्तुति"),
      "insufficient-evidence": t("Insufficient evidence", "पर्याप्त सबूत नहीं"),
    };
    const leaning = finding?.leaning || "insufficient-evidence";
    add(card, "p", labels[leaning]).className = "review-finding";
    const bar = add(card, "div", "");
    bar.className = "review-spectrum";
    bar.setAttribute("aria-label", t("Article framing spectrum", "लेख की प्रस्तुति का स्पेक्ट्रम"));
    for (const [key, title] of [
      ["left-leaning", t("Left", "वाम")],
      ["centrist-framing", t("Centre", "मध्य")],
      ["right-leaning", t("Right", "दक्षिण")],
    ]) {
      const part = add(bar, "span", title);
      part.className = "review-spectrum-part " + key;
      if (key === leaning) {
        part.classList.add("is-selected");
        part.setAttribute("aria-current", "true");
      }
    }
    add(card, "p", t("One article · provisional AI assessment", "एक लेख · शुरुआती एआई आकलन")).className = "fine";
    if (finding) add(card, "p", finding.explanation, review.language);
    for (const quote of finding?.quotes || []) add(card, "blockquote", quote).dir = "auto";
    const source = add(card, "div", "");
    source.className = "review-source-status";
    add(source, "strong", t("Source political leaning", "प्रकाशक का राजनीतिक झुकाव"));
    add(source, "p", t("Unassessed. This source has no documented, editor-reviewed rating in our catalogue.",
      "आकलन नहीं हुआ। हमारी सूची में इस प्रकाशक की संपादक द्वारा जाँची गई रेटिंग उपलब्ध नहीं है।"));
    add(card, "p", t("Coverage distribution needs multiple assessed sources. No coverage percentages are calculated from one article.",
      "कवरेज के वितरण के लिए कई आकलित स्रोत चाहिए। एक लेख से कवरेज के प्रतिशत नहीं निकाले जाते।")).className = "fine";
  }

  function render(review) {
    result.replaceChildren();
    const section = add(result, "section", "");
    section.className = "review-message review-assistant";
    add(section, "h2", t("Article review", "लेख की समीक्षा"));
    add(section, "p", t("Provisional AI review. Independent fact-checking is still needed.",
      "यह शुरुआती एआई समीक्षा है। स्वतंत्र तथ्य-जाँच अभी बाकी है।")).className = "notice";
    add(section, "p", review.summary, review.language);
    framingCard(section, review);
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

  let blindspotKey = "";
  function renderBlindspots(record) {
    const key = JSON.stringify([record.id, record.blindspots]);
    if (key === blindspotKey && blindspotPanel.childElementCount) return;
    blindspotKey = key;
    const expanded = blindspotPanel.querySelector("details")?.open;
    blindspotPanel.replaceChildren();
    const section = add(blindspotPanel, "section", ""); section.className = "review-message review-blindspots";
    add(section, "p", t("Coverage gaps", "कवरेज में कमियाँ")).className = "review-role";
    add(section, "h2", t("Blindspot check", "ब्लाइंडस्पॉट जाँच"));
    add(section, "p", t("What might be outside this comparison?", "इस तुलना से क्या छूट सकता है?"));
    const finding = add(section, "div", ""); finding.className = "blindspot-finding";
    add(finding, "strong", t("Political blindspots: not measurable yet", "राजनीतिक ब्लाइंडस्पॉट: अभी मापना संभव नहीं"));
    add(finding, "p", t("Reader-added links cannot tell us which political side is under-covering a story. We need a monitored source list, a time window, reviewed story matches and documented outlet assessments.",
      "पाठक के जोड़े लिंक यह नहीं बताते कि किस राजनीतिक पक्ष में किसी खबर की कवरेज कम है। इसके लिए निगरानी किए गए स्रोतों की सूची, समय सीमा, जाँचे गए घटना-मिलान और प्रमाणित प्रकाशक आकलन चाहिए।"));
    const sample = record.blindspots?.sample;
    if (sample) {
      const list = add(section, "ul", ""); list.className = "blindspot-audit";
      const row = (title, detail) => {
        const item = add(list, "li", ""); add(item, "strong", title); add(item, "p", detail);
      };
      row(t("Source breadth", "स्रोतों की विविधता"), t(
        `${sample.distinctWebSources} distinct website sources across ${sample.links} linked items. Repeated links from one outlet count as one website source.`,
        `${sample.links} लिंक में ${sample.distinctWebSources} अलग वेबसाइट स्रोत। एक ही प्रकाशक के कई लिंक एक वेबसाइट स्रोत के रूप में गिने जाते हैं।`));
      if (sample.unavailable) row(t("Unreadable material", "न पढ़ी जा सकी सामग्री"), t(
        `${sample.unavailable} linked items could not be retrieved. Their contents and perspectives are unknown.`,
        `${sample.unavailable} लिंक की सामग्री नहीं मिली। उनकी सामग्री और दृष्टिकोण अज्ञात हैं।`));
      if (sample.pending) row(t("Retrieval pending", "सामग्री प्राप्ति बाकी है"), t(
        `${sample.pending} linked items are still waiting to be read.`, `${sample.pending} लिंक अभी पढ़े जाने बाकी हैं।`));
      if (sample.partialText) row(t("Partial text", "आंशिक पाठ"), t(
        `${sample.partialText} linked pages are marked as partially extracted. Missing text could change how the coverage is understood.`,
        `${sample.partialText} लिंक से आंशिक पाठ मिलने का संकेत है। छूटा हुआ पाठ कवरेज की समझ बदल सकता है।`));
      if (sample.unverifiedVideos) row(t("Unexamined broadcasts", "बिना जाँचे प्रसारण"), t(
        `${sample.unverifiedVideos} YouTube links; no transcript, audio or video automatically retrieved. Any pasted text is reviewed separately above. Titles and uploader metadata cannot establish what the broadcast said.`,
        `${sample.unverifiedVideos} YouTube लिंक; कोई ट्रांसक्रिप्ट, ऑडियो या वीडियो अपने आप प्राप्त नहीं किया गया। पेस्ट किए गए पाठ की अलग समीक्षा ऊपर है। शीर्षक और अपलोडर मेटाडेटा से प्रसारण की बातों का पता नहीं चलता।`));
      if (sample.retrievalUnconfirmed) row(t("Unconfirmed link retrieval", "लिंक से पाठ प्राप्ति की पुष्टि नहीं"), t(
        `${sample.retrievalUnconfirmed} submitted links have no confirmed automatic text extraction.`,
        `${sample.retrievalUnconfirmed} भेजे गए लिंक से स्वचालित पाठ प्राप्ति की पुष्टि नहीं है।`));
      if (sample.unattributedText) row(t("Publisher unknown", "प्रकाशक अज्ञात"), t(
        "The pasted article has no source URL. Its publisher cannot be counted in a coverage comparison.",
        "पेस्ट किए गए लेख का स्रोत लिंक नहीं है। कवरेज तुलना में उसके प्रकाशक को नहीं गिना जा सकता।"));
      if (!sample.unavailable && !sample.pending && sample.links > 0 && !sample.retrievalUnconfirmed && !sample.unverifiedVideos) {
        row(t("Text access", "पाठ तक पहुँच"), t("Some text was retrieved from every linked page. Completeness and same-story membership remain unconfirmed.",
          "हर लिंक से कुछ पाठ मिला है। पूरा पाठ मिलने और लिंक एक ही घटना के होने की पुष्टि अभी बाकी है।"));
      }
    }
    const detail = add(section, "details", ""); detail.open = Boolean(expanded);
    add(detail, "summary", t("How a political blindspot will be established", "राजनीतिक ब्लाइंडस्पॉट कैसे तय होगा"));
    add(detail, "p", t("We will compare unique, assessed outlets covering the same confirmed event within a disclosed monitoring window. The sample, counts, unassessed outlets and inaccessible material must remain visible. A low count is a finding about that monitored sample, not proof that a whole political side ignored the story.",
      "घोषित निगरानी अवधि में एक ही पुष्टि की गई घटना की कवरेज करने वाले अलग-अलग आकलित प्रकाशकों की तुलना होगी। नमूना, संख्या, अनाकलित प्रकाशक और अप्राप्य सामग्री दिखाई जाएगी। कम संख्या उस नमूने का निष्कर्ष है; इससे यह साबित नहीं होता कि पूरे राजनीतिक पक्ष ने खबर को अनदेखा किया।"));
    const method = add(detail, "a", t("Read the blindspot method", "ब्लाइंडस्पॉट की विधि पढ़ें"));
    method.href = form.dataset.methodUrl || "../method/#blindspots";
  }

  let coverageKey = "";
  function renderCoverage(record, requestNumber) {
    const key = JSON.stringify([record.id, record.url, record.title, record.source, record.extraction, record.coverage]);
    if (key === coverageKey && coveragePanel.childElementCount) return;
    coverageKey = key;
    const draft = coveragePanel.querySelector("input")?.value || "";
    const hadFocus = coveragePanel.contains(document.activeElement);
    coveragePanel.replaceChildren();
    const section = add(coveragePanel, "section", "");
    section.className = "review-message review-coverage";
    add(section, "p", t("Coverage desk", "कवरेज डेस्क")).className = "review-role";
    add(section, "h2", t("Who else is covering this?", "और कौन यह खबर दिखा रहा है?"));
    add(section, "p", t("Build a comparison with newspaper, digital and TV-channel links, including YouTube videos.",
      "अखबारों, डिजिटल प्रकाशकों और टीवी चैनलों के लिंक जोड़कर तुलना करें। YouTube वीडियो भी जोड़ सकते हैं।"));
    const links = [...(record.coverage || [])];
    if (record.url) links.unshift({
      id: "original", url: record.url, title: record.title || record.url,
      publisher: record.source?.name || new URL(record.url).hostname,
      sourceId: record.source?.id || new URL(record.url).hostname,
      medium: record.source?.medium || "web", status: record.extraction ? "readable" : "submitted",
      characters: record.extraction?.examinedCharacters || 0, checkedAt: record.extraction?.retrievedAt,
      note: record.extraction ? t("Text examined for the review above.", "ऊपर की समीक्षा के लिए पाठ पढ़ा गया।") :
        t("Original submitted link. Automatic text retrieval is not confirmed.", "मूल रूप से भेजा गया लिंक। स्वचालित पाठ प्राप्ति की पुष्टि नहीं हुई है।"),
    });
    const sources = new Map();
    for (const link of links) {
      const id = link.sourceId || new URL(link.url).hostname;
      // An unverified YouTube uploader is not merged with a broadcaster or another video.
      const sourceKey = link.medium === "youtube" || /(^|\.)(youtube\.com|youtu\.be)$/.test(new URL(link.url).hostname)
        ? link.url : id;
      if (!sources.has(sourceKey)) sources.set(sourceKey, link);
    }
    const stats = add(section, "div", ""); stats.className = "coverage-stats";
    for (const [value, label] of [[links.length, t("Links in sample", "नमूने में लिंक")],
      [0, t("Outlets assessed", "आकलित प्रकाशक")],
      [links.filter(link => link.medium === "tv-web").length, t("TV website links", "टीवी वेबसाइट लिंक")]]) {
      const cell = add(stats, "div", ""); add(cell, "strong", String(value)); add(cell, "span", label);
    }
    const spectrum = add(section, "div", ""); spectrum.className = "coverage-lanes";
    spectrum.setAttribute("aria-label", t("Outlet political leaning, all unassessed", "प्रकाशकों का राजनीतिक झुकाव, सभी अनाकलित"));
    for (const [name, style] of [[t("Left", "वाम"), "left"], [t("Centre", "मध्य"), "centre"], [t("Right", "दक्षिण"), "right"]]) {
      const lane = add(spectrum, "div", ""); lane.className = "coverage-lane " + style;
      add(lane, "strong", name); add(lane, "span", "—");
      add(lane, "small", t("No reviewed ratings", "समीक्षित रेटिंग नहीं"));
    }
    add(section, "p", t("Political distribution unavailable. No outlet in this sample has a documented, editor-reviewed political rating. Article-level AI findings above do not rate the outlet.",
      "राजनीतिक वितरण उपलब्ध नहीं। इस नमूने के किसी प्रकाशक की संपादक द्वारा जाँची गई राजनीतिक रेटिंग नहीं है। ऊपर दिया गया एआई आकलन लेख का है, प्रकाशक का नहीं।")).className = "coverage-note";
    add(section, "h3", t("Unassessed sources", "अनाकलित स्रोत"));
    if (!links.length) add(section, "p", t("Add the first coverage link below.", "नीचे पहला कवरेज लिंक जोड़ें।"));
    const badges = add(section, "div", ""); badges.className = "coverage-badges";
    for (const link of sources.values()) {
      const anchor = add(badges, "a", ""); anchor.href = link.url; anchor.target = "_blank"; anchor.rel = "noreferrer";
      const name = link.publisher || new URL(link.url).hostname;
      const avatar = add(anchor, "span", name.replace(/^www\./, "").split(/[\s.]+/).map(word => Array.from(word)[0]).slice(0, 3).join(""));
      avatar.className = "coverage-avatar"; avatar.setAttribute("aria-hidden", "true");
      add(anchor, "span", name);
      add(anchor, "small", link.medium === "tv-web" ? t("TV · website", "टीवी · वेबसाइट") :
        link.medium === "youtube" ? t("YouTube · unverified channel", "YouTube · अपुष्ट चैनल") : t("Web", "वेब"));
      if (link.status === "unavailable") add(anchor, "small", t("Content unavailable", "सामग्री उपलब्ध नहीं"));
      if (link.status === "metadata-only") add(anchor, "small", t("Metadata only", "केवल मेटाडेटा"));
      if (["queued", "running"].includes(link.status)) add(anchor, "small", t("Retrieval pending", "सामग्री प्राप्ति बाकी है"));
    }
    const details = add(section, "details", ""); details.className = "coverage-evidence";
    add(details, "summary", t("Inspect the linked material", "लिंक की सामग्री देखें"));
    const list = add(details, "ul", "");
    for (const link of links) {
      const row = add(list, "li", "");
      const title = add(row, "a", link.title || link.url); title.href = link.url; title.target = "_blank"; title.rel = "noreferrer";
      const state = { queued: t("Waiting to read", "पढ़ना बाकी है"), running: t("Reading…", "पढ़ा जा रहा है…"),
        readable: t("Page text retrieved", "पृष्ठ का पाठ मिला"), "metadata-only": t("Video metadata only", "केवल वीडियो मेटाडेटा"),
        unavailable: t("Content unavailable", "सामग्री उपलब्ध नहीं"), submitted: t("Submitted link", "भेजा गया लिंक") }[link.status] || link.status;
      add(row, "p", state + (link.characters ? ` · ${link.characters} ${t("characters", "अक्षर")}` : "") + (link.partial ? t(" · partial", " · आंशिक") : ""));
      if (link.note) add(row, "p", link.note);
      if (link.id !== "original") {
        const remove = add(row, "button", t("Remove link", "लिंक हटाएँ")); remove.type = "button";
        remove.addEventListener("click", async () => {
          const identity = current;
          if (!identity) return;
          remove.disabled = true;
          try {
            const response = await fetch(endpoint + "/" + identity.id + "/coverage", {
              method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + identity.token },
              body: JSON.stringify({ remove: link.id }), signal: AbortSignal.timeout(20000),
            });
            if (requestNumber !== activeRequest) return;
            if (!response.ok) throw new Error("remove");
            clearTimeout(pollTimer);
            showRecord(await response.json(), requestNumber);
          } catch {
            remove.disabled = false;
            remove.textContent = t("Could not confirm removal. Retry.", "हटाने की पुष्टि नहीं हुई। फिर कोशिश करें।");
          }
        });
      }
    }
    const dates = links.map(link => link.checkedAt).filter(Boolean).sort();
    add(section, "p", t("Reader-selected sample. Same-story membership is unconfirmed. This is not a monitored coverage window or a live-TV feed.",
      "यह पाठक का चुना नमूना है। लिंक एक ही घटना के हैं, इसकी पुष्टि नहीं हुई है। यह निगरानी की गई कवरेज अवधि या लाइव टीवी फीड नहीं है।") +
      (dates.length ? " " + t("Last material check: ", "सामग्री की आखिरी जाँच: ") + new Date(dates.at(-1)).toLocaleString(hindi ? "hi-IN" : "en-IN") : "")).className = "coverage-note";
    const composer = add(section, "form", ""); composer.className = "coverage-composer";
    const inputLabel = add(composer, "label", t("Add coverage of the same event", "इसी घटना की कवरेज जोड़ें"));
    inputLabel.htmlFor = "coverage-url";
    const input = add(composer, "input", ""); input.id = "coverage-url"; input.name = "coverage-url";
    input.type = "url"; input.required = true; input.maxLength = 2000; input.placeholder = "https://…"; input.value = draft;
    const send = add(composer, "button", t("Add coverage link", "कवरेज लिंक जोड़ें")); send.type = "submit";
    const progress = add(composer, "p", ""); progress.setAttribute("role", "status");
    add(composer, "p", t("Up to 8 additional links per saved review. TV websites are read as pages. YouTube supplies title and uploader metadata; transcripts and broadcasts are not analysed here. Adding links does not run Qwen again.",
      "हर सहेजी समीक्षा में अधिकतम 8 अतिरिक्त लिंक। टीवी वेबसाइटों का पाठ पढ़ा जाता है। YouTube से शीर्षक और अपलोडर मेटाडेटा मिलता है; यहाँ ट्रांसक्रिप्ट और प्रसारण का विश्लेषण नहीं होता। लिंक जोड़ने पर Qwen फिर नहीं चलता।"));
    const directory = add(section, "details", ""); directory.className = "coverage-evidence coverage-directory";
    add(directory, "summary", t("Find reporting from TV channels", "टीवी चैनलों की रिपोर्टिंग खोजें"));
    add(directory, "p", t("Open a channel's website, find the report and add its story link above. These directory entries are not included in the sample until you add a link.",
      "चैनल की वेबसाइट पर रिपोर्ट खोजें और ऊपर उसका लिंक जोड़ें। लिंक जोड़ने तक ये चैनल इस नमूने का हिस्सा नहीं हैं।"));
    const directoryLinks = add(directory, "div", "");
    for (const [name, url] of [["NDTV", "https://www.ndtv.com"], ["Aaj Tak", "https://www.aajtak.in"],
      ["India Today", "https://www.indiatoday.in"], ["ABP माझा", "https://marathi.abplive.com"],
      ["ABP અસ્મિતા", "https://gujarati.abplive.com"], ["TV9 Marathi", "https://www.tv9marathi.com"],
      ["TV9 Telugu", "https://tv9telugu.com"], ["TV9 Kannada", "https://tv9kannada.com"]]) {
      const anchor = add(directoryLinks, "a", name); anchor.href = url; anchor.target = "_blank"; anchor.rel = "noreferrer";
    }
    composer.addEventListener("submit", async event => {
      event.preventDefault();
      const identity = current;
      if (!identity || send.disabled) return;
      send.disabled = true; input.disabled = true;
      progress.textContent = t("Saving the link…", "लिंक सहेजा जा रहा है…");
      try {
        const response = await fetch(endpoint + "/" + identity.id + "/coverage", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + identity.token },
          body: JSON.stringify({ url: input.value.trim() }), signal: AbortSignal.timeout(20000),
        });
        if (requestNumber !== activeRequest) return;
        if (!response.ok) throw new Error(response.status === 429 ? "limit" : "link");
        input.value = "";
        clearTimeout(pollTimer);
        showRecord(await response.json(), requestNumber);
      } catch (error) {
        progress.textContent = error.message === "limit" ? t("The comparison or daily link limit has been reached.", "तुलना या दैनिक लिंक सीमा पूरी हो गई है।") :
          t("Could not confirm the save. Use a public HTTPS article or YouTube video link, then retry or reopen this saved review.", "सहेजने की पुष्टि नहीं हुई। सार्वजनिक HTTPS लेख या YouTube वीडियो लिंक दें, फिर कोशिश करें या सहेजी समीक्षा दोबारा खोलें।");
        send.disabled = false; input.disabled = false;
      }
    });
    if (hadFocus) input.focus();
  }

  function showRecord(record, requestNumber) {
    if (requestNumber !== activeRequest) return;
    showQuestion(record);
    renderBlindspots(record);
    renderCoverage(record, requestNumber);
    if (record.extraction) {
      const provenance = add(question, "p", t(
        `Read ${record.extraction.examinedCharacters} characters from the linked page${record.extraction.partial ? " · partial text" : ""}.`,
        `लिंक से ${record.extraction.examinedCharacters} अक्षर पढ़े गए${record.extraction.partial ? " · आंशिक पाठ" : ""}।`,
      ));
      provenance.className = "review-extraction fine";
    }
    if (record.status === "completed") {
      render(record.report);
      status.textContent = t("Review saved.", "समीक्षा सहेज दी गई।");
      setBusy(false);
      if (record.coverage?.some(link => ["queued", "running"].includes(link.status))) {
        pollTimer = setTimeout(() => loadRecord(current, requestNumber), 3000);
      }
      return;
    }
    if (record.status === "failed" || record.status === "limited") {
      status.textContent = record.status === "limited"
        ? t("Article saved. Today's review allowance is used up. You can retry after midnight UTC.",
          "लेख सहेज दिया गया है। आज की समीक्षा सीमा पूरी हो गई है। आधी रात UTC के बाद फिर कोशिश करें।")
        : record.url && !record.article
          ? t("The linked page could not be read. Open “Or paste the article text” and add the text to continue.",
            "लिंक का पाठ पढ़ा नहीं जा सका। “या लेख का पाठ पेस्ट करें” खोलकर पाठ जोड़ें।")
          : t("Article saved. The model could not complete the review. You can retry.",
            "लेख सहेज दिया गया है। मॉडल समीक्षा पूरी नहीं कर सका। फिर कोशिश कर सकते हैं।");
      setBusy(false);
      if (record.coverage?.some(link => ["queued", "running"].includes(link.status))) {
        pollTimer = setTimeout(() => loadRecord(current, requestNumber), 3000);
      }
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
      current = { ...identity, article: record.article, language: record.language, url: record.url || "" };
      form.elements.article.value = record.article;
      form.elements.url.value = record.url || "";
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

  async function submit(event) {
    event.preventDefault();
    if (button.disabled) return;
    clearTimeout(pollTimer);
    const requestNumber = ++activeRequest;
    const article = form.elements.article.value.trim();
    const url = form.elements.url.value.trim();
    if (!url && article.length < 100) {
      status.textContent = t("Add an article link or at least 100 characters of text.",
        "लेख का लिंक या कम से कम 100 अक्षर पाठ जोड़ें।");
      return;
    }
    const language = form.elements.language.value;
    if (!current || current.article !== article || current.language !== language || current.url !== url) {
      const token = [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, "0")).join("");
      current = { id: crypto.randomUUID(), token, article, language, url };
    }
    // Preserve the capability locally before the network request so a lost response is recoverable.
    remember(current);
    setBusy(true);
    status.textContent = t("Saving your submission and reading the article…", "सामग्री सहेजी जा रही है और लेख पढ़ा जा रहा है…");
    showQuestion({ article, url });
    result.replaceChildren();
    coveragePanel.replaceChildren();
    blindspotPanel.replaceChildren();
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article, language, url, id: current.id, token: current.token, save: true }),
        signal: AbortSignal.timeout(20_000),
      });
      if (requestNumber !== activeRequest) return;
      if (!response.ok) {
        if (response.status === 429) throw new Error("limit");
        if (response.status === 409) throw new Error("conflict");
        if (response.status === 400) throw new Error("input");
        throw new Error("save");
      }
      showRecord(await response.json(), requestNumber);
    } catch (error) {
      if (requestNumber !== activeRequest) return;
      status.textContent = error.message === "limit"
        ? t("Today's submission allowance is used up. Try again tomorrow.", "आज की सामग्री भेजने की सीमा पूरी हो गई है। कल फिर कोशिश करें।")
        : error.message === "input"
          ? t("Use a public HTTPS article link, or paste 100–8,000 characters of article text.", "सार्वजनिक HTTPS लेख लिंक दें या लेख का 100–8,000 अक्षरों का पाठ पेस्ट करें।")
        : t("Could not confirm the save. Use the private link to check, or retry this submission.",
          "सहेजे जाने की पुष्टि नहीं हुई। निजी लिंक से जाँचें या फिर भेजें।");
      setBusy(false);
    }
  }
  form.addEventListener("submit", submit);

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
  if (!location.hash) {
    try {
      const provided = new URLSearchParams(location.search).get("url");
      if (provided && provided.length <= 2000) {
        const source = new URL(provided);
        if (source.protocol === "https:" && !source.username && !source.password) {
          form.elements.url.value = source.href;
          status.textContent = t("Article link ready. Submit it to retrieve the text and start a private Qwen review.", "लेख लिंक तैयार है। पाठ प्राप्त करने और निजी Qwen समीक्षा शुरू करने के लिए इसे भेजें।");
        }
      }
    } catch {}
  }
  if (location.hash) openLink();
  else {
    try {
      const latest = localStorage.getItem("india-news-latest-review");
      if (latest && new URL(latest).origin === location.origin) {
        add(tools, "a", t("Open your last saved review", "पिछली सहेजी गई समीक्षा खोलें")).href = latest;
      }
    } catch {}
  }
  const cleanup = () => {
    disposed = true;
    activeRequest++;
    clearTimeout(pollTimer);
    removeEventListener("hashchange", openLink);
    form.removeEventListener("submit", submit);
    languageLink?.removeEventListener("click", switchLanguage, true);
    mounted.delete(form);
  };
  mounted.set(form, cleanup);
  return cleanup;
}
window.mountIndiaNewsReview = mount;
mount();
})();
