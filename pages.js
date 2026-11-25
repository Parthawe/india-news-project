const menuButton = document.querySelector(".menu-button");
const mainNav = document.querySelector(".site-header .nav");
if (menuButton && mainNav) {
  const menu = mainNav.cloneNode(true);
  menu.id = "publication-menu";
  menu.className = "publication-menu";
  menu.hidden = true;
  menu.setAttribute("aria-label", document.documentElement.lang === "hi" ? "सभी अनुभाग" : "All sections");
  for (const selector of [".pilot-strip a", ".header-action", ".footer a[href$='/corrections/']"]) {
    const link = document.querySelector(selector)?.cloneNode(true);
    if (!link) continue;
    link.removeAttribute("class");
    menu.append(link);
  }
  mainNav.after(menu);
  function showMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    if(open)menu.querySelector("a")?.focus({preventScroll:true});
  }
  menuButton.addEventListener("click", () => showMenu(menu.hidden));
  document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!menuButton.closest('header').contains(event.target))showMenu(false)});
  const menuBreakpoint=matchMedia('(max-width:1024px)');menuBreakpoint.addEventListener('change',()=>{if(!menuBreakpoint.matches)showMenu(false)});
  menu.addEventListener("click", event => {
    if (event.target.closest("a")) showMenu(false);
  });
  menuButton.closest("header").addEventListener("keydown", event => {
    if (event.key === "Escape" && !menu.hidden) {
      showMenu(false);
      menuButton.focus();
    }
  });
}

function revealCitation() {
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  if (!id.startsWith("source-")) return;
  const source = document.getElementById(id);
  const details = source?.closest("details");
  if (!details) return;
  details.open = true;
  requestAnimationFrame(() => source.scrollIntoView({ block: "start" }));
}
addEventListener("hashchange", revealCitation);
revealCitation();

const register = document.querySelector("form[data-register]");
if (register) {
  const params = new URLSearchParams(location.search);
  const query = params.get("q") || "";
  const language = params.get("language") || "";
  const status = params.get("status") || "";
  register.elements.q.value = query;
  register.elements.language.value = language;
  register.elements.status.value = status;
  const words = query.toLowerCase().trim().split(/\s+/u).filter(Boolean);
  let visible = 0;
  for (const article of document.querySelectorAll("article[data-search]")) {
    article.hidden = !(words.every(word => article.dataset.search.includes(word))
      && (!language || article.dataset.language === language)
      && (!status || article.dataset.status.split(" ").includes(status)));
    if (!article.hidden) visible++;
  }
  document.querySelector("[data-filter-count]").textContent = visible;
  document.querySelector("[data-filter-empty]").hidden = visible !== 0;
}

const alternate = document.querySelector(".lang-switch");
if (alternate) {
  alternate.search = location.search;
  alternate.hash = location.hash;
}
