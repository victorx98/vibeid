(function () {
  const ns = window.aiResume || (window.aiResume = {});

  function renderProjectList(data, state, callbacks) {
    document.getElementById("project-list").innerHTML = data.projects
      .map(
        (project) => `
          <button
            class="project-nav-button ${project.id === state.activeProjectId ? "active" : ""}"
            type="button"
            data-project-id="${project.id}"
          >
            <span class="project-nav-title">${project.navTitle}</span>
            <span class="project-nav-meta">${project.navMeta}</span>
          </button>
        `
      )
      .join("");

    document.querySelectorAll(".project-nav-button").forEach((button) => {
      const projectId = button.dataset.projectId;

      button.addEventListener("click", () => callbacks.onSelect(projectId));
      button.addEventListener("mouseenter", () => callbacks.onHover(projectId));
      button.addEventListener("mouseleave", callbacks.onLeave);
      button.addEventListener("focus", () => callbacks.onHover(projectId));
      button.addEventListener("blur", callbacks.onLeave);
    });
  }

  function renderProjectDetail(data, state, callbacks) {
    const project = ns.state.getActiveProject(data, state);
    const stageIndex = state.activeStageByProject[project.id];
    const stage = project.stages[stageIndex];

    document.getElementById("project-detail").innerHTML = `
      <article class="project-view" style="--project-accent:${project.accent}">
        <div class="project-view-head">
          <div>
            <p class="eyebrow">${project.source}</p>
            <h3>${project.title}</h3>
            <p class="project-summary">${project.summary}</p>
          </div>
          <div class="project-metric-row">
            ${project.metrics
              .map(
                (metric) => `
                  <div class="mini-metric">
                    <span class="mini-metric-label">${metric.label}</span>
                    <strong>${metric.value}</strong>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="project-tech-row">
          ${project.relatedTech
            .map((techId) => {
              const tech = data.stack.find((item) => item.id === techId);
              return tech ? ns.icons.renderTechChip(tech, true) : "";
            })
            .join("")}
        </div>

        <div class="project-note-grid">
          <div class="note-card">
            <h4>What I owned</h4>
            <ul class="compact-list">
              ${project.owned.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </div>
          <div class="note-card">
            <h4>Why this mattered</h4>
            <p>${project.algorithmSummary}</p>
          </div>
        </div>

        <div class="algorithm-view">
          <div class="algorithm-stage-row">
            ${project.stages
              .map(
                (item, index) => `
                  <button
                    class="stage-button ${index === stageIndex ? "active" : ""}"
                    type="button"
                    data-stage-index="${index}"
                  >
                    ${item.label}
                  </button>
                `
              )
              .join("")}
          </div>

          <div class="algorithm-card-grid">
            <article class="algorithm-card">
              <p class="card-label">Input</p>
              <h4>${stage.inputTitle}</h4>
              <ul class="compact-list">
                ${stage.inputLines.map((line) => `<li>${line}</li>`).join("")}
              </ul>
            </article>

            <article class="algorithm-card emphasis">
              <p class="card-label">Logic</p>
              <h4>${stage.operationTitle}</h4>
              <ul class="compact-list">
                ${stage.operationLines.map((line) => `<li>${line}</li>`).join("")}
              </ul>
            </article>

            <article class="algorithm-card">
              <p class="card-label">Output</p>
              <h4>${stage.outputTitle}</h4>
              <ul class="compact-list">
                ${stage.outputLines.map((line) => `<li>${line}</li>`).join("")}
              </ul>
            </article>
          </div>

          <div class="pm-note">
            <span class="pm-note-label">Product lens</span>
            <p>${stage.pmNote}</p>
          </div>

          <div class="widget-panel">
            ${ns.widgets.renderWidget(project, state, stageIndex)}
          </div>
        </div>
      </article>
    `;

    bindProjectDetail(project, callbacks);
  }

  function bindProjectDetail(project, callbacks) {
    document.querySelectorAll(".stage-button").forEach((button) => {
      button.addEventListener("click", () => {
        callbacks.onStageChange(project.id, Number(button.dataset.stageIndex));
      });
    });

    if (project.widget.type === "ranking") {
      document.querySelectorAll(".widget-toggle-button").forEach((button) => {
        button.addEventListener("click", () => {
          callbacks.onRankingModeChange(project.id, button.dataset.mode);
        });
      });
    }

    if (project.widget.type === "graph") {
      document.querySelectorAll(".widget-toggle-button").forEach((button) => {
        button.addEventListener("click", () => {
          callbacks.onGraphViewChange(project.id, button.dataset.view);
        });
      });
    }

    if (project.widget.type === "roi-structure") {
      const input = document.querySelector(".threshold-input");
      input.addEventListener("input", () => {
        callbacks.onThresholdChange(project.id, Number(input.value));
      });
    }
  }

  ns.renderProjects = {
    renderProjectList,
    renderProjectDetail
  };
})();
