(function () {
  const ns = window.aiResume || (window.aiResume = {});

  /* Devicon CDN base — stable, versioned, widely used */
  const DEVICON_BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

  const iconMap = {
    python: `${DEVICON_BASE}/python/python-original.svg`,
    r: `${DEVICON_BASE}/r/r-original.svg`,
    spark: `${DEVICON_BASE}/apachespark/apachespark-original.svg`,
    sql: `${DEVICON_BASE}/azuresqldatabase/azuresqldatabase-original.svg`,
    fastapi: `${DEVICON_BASE}/fastapi/fastapi-original.svg`,
    react: `${DEVICON_BASE}/react/react-original.svg`,
    nextjs: `${DEVICON_BASE}/nextjs/nextjs-original.svg`,
    sveltekit: `${DEVICON_BASE}/svelte/svelte-original.svg`,
    pytorch: `${DEVICON_BASE}/pytorch/pytorch-original.svg`,
    tableau: null,
    shiny: null,
    docker: `${DEVICON_BASE}/docker/docker-original.svg`,
    git: `${DEVICON_BASE}/git/git-original.svg`
  };

  function fallbackMark(label) {
    const initials = label
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return `<span class="fallback-mark">${initials || "AI"}</span>`;
  }

  function renderTechIcon(id, label) {
    const src = iconMap[id];
    if (src) {
      return `<img src="${src}" alt="${label}" loading="lazy">`;
    }
    return fallbackMark(label);
  }

  function renderTechChip(tech, highlighted) {
    return `
      <span class="tech-chip ${highlighted ? "is-highlighted" : ""}" style="--tech-color:${tech.color}">
        <span class="tech-icon">${renderTechIcon(tech.id, tech.label)}</span>
        <span class="tech-label">${tech.label}</span>
      </span>
    `;
  }

  ns.icons = {
    renderTechChip
  };
})();
