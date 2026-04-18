(function () {
  const ns = window.aiResume || (window.aiResume = {});

  function renderHeader(data) {
    document.getElementById("name").textContent = data.profile.name;
    document.getElementById("summary").textContent = data.profile.summary;

    document.getElementById("contact-block").innerHTML = `
      <div class="contact-row">
        <span>${data.profile.location}</span>
        <span>${data.profile.phone}</span>
      </div>
      <div class="contact-row">
        <a href="mailto:${data.profile.email}">${data.profile.email}</a>
        <a href="${data.profile.website}" target="_blank" rel="noreferrer">Website</a>
      </div>
      <div class="contact-row">
        <a href="${data.profile.github}" target="_blank" rel="noreferrer">GitHub</a>
        <a href="${data.profile.scholar}" target="_blank" rel="noreferrer">Google Scholar</a>
      </div>
    `;
  }

  function renderSidebar(data, state) {
    document.getElementById("strength-list").innerHTML = data.strengths
      .map((item) => `<li>${item}</li>`)
      .join("");

    renderQuantGrid(data, state);
    renderStackList(data, state);
  }

  function renderQuantGrid(data, state) {
    const activeProjectId = state.hoverProjectId || state.activeProjectId;

    document.getElementById("quant-grid").innerHTML = data.quantToolkit
      .map((item) => {
        const highlighted = item.relatedProjects.includes(activeProjectId);
        return `<span class="quant-tag ${highlighted ? "is-highlighted" : ""}">${item.label}</span>`;
      })
      .join("");
  }

  function renderStackList(data, state) {
    const highlightedIds = ns.state.getHighlightedTechIds(data, state);

    document.getElementById("stack-list").innerHTML = data.stack
      .map((tech) => ns.icons.renderTechChip(tech, highlightedIds.has(tech.id)))
      .join("");
  }

  function renderResults(data) {
    document.getElementById("results-grid").innerHTML = data.results
      .map(
        (result) => `
          <article class="result-card">
            <p class="result-value">${result.value}</p>
            <p class="result-label">${result.label}</p>
            <p class="result-note">${result.note}</p>
          </article>
        `
      )
      .join("");
  }

  function renderExperience(data) {
    document.getElementById("experience-list").innerHTML = data.experience
      .map(
        (item) => `
          <article class="experience-item">
            <div class="experience-head">
              <div>
                <h3>${item.role}</h3>
                <p class="experience-org">${item.organization}${item.location ? " · " + item.location : ""}</p>
              </div>
              <p class="experience-dates">${item.dates}</p>
            </div>
            <ul class="compact-list">
              ${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
            </ul>
          </article>
        `
      )
      .join("");
  }

  function renderEducation(data) {
    document.getElementById("education-list").innerHTML = data.education
      .map(
        (item) => `
          <article class="education-item">
            <h3>${item.degree}</h3>
            <p>${item.school}</p>
            <p class="muted-line">${item.dates}</p>
            <p class="muted-line">${item.note}</p>
          </article>
        `
      )
      .join("");
  }

  function renderLinks(data) {
    document.getElementById("link-list").innerHTML = data.links
      .map(
        (item) => `
          <a class="link-card" href="${item.href}" target="${item.href.startsWith("mailto:") ? "_self" : "_blank"}" rel="noreferrer">
            <span class="link-label">${item.label}</span>
            <span class="link-value">${item.value}</span>
          </a>
        `
      )
      .join("");
  }

  ns.renderStatic = {
    renderHeader,
    renderSidebar,
    renderQuantGrid,
    renderStackList,
    renderResults,
    renderExperience,
    renderEducation,
    renderLinks
  };
})();
