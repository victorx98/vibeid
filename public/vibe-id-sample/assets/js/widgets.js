(function () {
  const ns = window.aiResume || (window.aiResume = {});

  function renderWidget(project, state, stageIndex) {
    if (project.widget.type === "ranking") {
      return renderRankingWidget(project, state);
    }

    if (project.widget.type === "graph") {
      return renderGraphWidget(project, state);
    }

    if (project.widget.type === "roi-structure") {
      return renderRoiStructureWidget(project, state, stageIndex);
    }

    return "";
  }

  function renderRankingWidget(project, state) {
    const modeId = state.rankingModeByProject[project.id] || project.widget.modes[0].id;
    const activeMode = project.widget.modes.find((mode) => mode.id === modeId);

    return `
      <div class="widget-head">
        <div>
          <h4>${project.widget.title}</h4>
          <p>${project.widget.help}</p>
        </div>
        <div class="toggle-row">
          ${project.widget.modes
            .map(
              (mode) => `
                <button
                  class="widget-toggle-button ${mode.id === activeMode.id ? "active" : ""}"
                  type="button"
                  data-mode="${mode.id}"
                >
                  ${mode.label}
                </button>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="ranking-summary">
        <div class="score-box">
          <span class="score-label">${activeMode.scoreName}</span>
          <strong>${activeMode.scoreValue}</strong>
        </div>
        <p class="widget-note">${activeMode.note}</p>
      </div>

      <div class="ranking-list">
        ${activeMode.ranking
          .map(
            (item) => `
              <div class="ranking-row">
                <span class="ranking-name">${item.label}</span>
                <div class="ranking-bar-track">
                  <div class="ranking-bar-fill" style="width:${item.value}%"></div>
                </div>
                <span class="ranking-score">${item.value}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderGraphWidget(project, state) {
    const viewId = state.graphViewByProject[project.id] || project.widget.views[0].id;
    const activeView = project.widget.views.find((view) => view.id === viewId);

    return `
      <div class="widget-head">
        <div>
          <h4>${project.widget.title}</h4>
          <p>${project.widget.help}</p>
        </div>
        <div class="toggle-row">
          ${project.widget.views
            .map(
              (view) => `
                <button
                  class="widget-toggle-button ${view.id === activeView.id ? "active" : ""}"
                  type="button"
                  data-view="${view.id}"
                >
                  ${view.label}
                </button>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="graph-wrap">
        ${renderGraphSvg(project.widget.nodes, project.widget.edges, activeView)}
      </div>
      <p class="widget-note">${activeView.note}</p>
    `;
  }

  function renderGraphSvg(nodes, edges, activeView) {
    const edgeMarkup = edges
      .map(([from, to]) => {
        const start = nodes.find((node) => node.id === from);
        const end = nodes.find((node) => node.id === to);
        const edgeId = `${from}-${to}`;
        const reverseId = `${to}-${from}`;
        const highlighted =
          activeView.highlightEdges.includes(edgeId) || activeView.highlightEdges.includes(reverseId);

        return `
          <line
            x1="${start.x}"
            y1="${start.y}"
            x2="${end.x}"
            y2="${end.y}"
            class="graph-edge ${highlighted ? "highlighted" : ""}"
          />
        `;
      })
      .join("");

    const nodeMarkup = nodes
      .map((node) => {
        const highlighted = activeView.highlightNodes.includes(node.id);
        return `
          <g class="graph-node-group ${highlighted ? "highlighted" : ""}">
            <circle cx="${node.x}" cy="${node.y}" r="8"></circle>
            <text x="${node.x}" y="${node.y + 16}" text-anchor="middle">${node.label}</text>
          </g>
        `;
      })
      .join("");

    return `
      <svg class="graph-svg" viewBox="0 0 100 100" aria-hidden="true">
        ${edgeMarkup}
        ${nodeMarkup}
      </svg>
    `;
  }

  function renderRoiStructureWidget(project, state, stageIndex) {
    const widget = project.widget;
    const value = state.thresholdByProject[project.id] || widget.value;
    const features = computeFeatureValues(widget.features, value);
    const roiScores = computeRoiScores(widget.rois, features);
    const leadingRoi = roiScores.reduce((best, current) => (current.score > best.score ? current : best), roiScores[0]);
    const focusKey = ["input", "feature", "roi", "report"][Math.min(stageIndex, 3)];
    const marker = ((value - widget.min) / (widget.max - widget.min)) * 100;
    const positiveArea = Math.round((roiScores[0].score + roiScores[1].score) / 2);
    const qcNote = value >= 42 && value <= 56 ? "Stable" : value < 42 ? "More noise admitted" : "Useful signal starts dropping";

    return `
      <div class="widget-head">
        <div>
          <h4>${widget.title}</h4>
          <p>${widget.help}</p>
        </div>
      </div>

      <label class="slider-label" for="threshold-input">
        Threshold
        <strong>${value}</strong>
      </label>
      <input
        id="threshold-input"
        class="threshold-input"
        type="range"
        min="${widget.min}"
        max="${widget.max}"
        value="${value}"
      >

      <div class="structure-flow">
        <section class="structure-column ${focusKey === "input" ? "is-emphasis" : ""}">
          <p class="structure-title">Input tiles</p>
          <div class="patch-cluster">
            ${widget.patches.map((patch) => renderPatchCard(patch, value)).join("")}
          </div>
        </section>

        <div class="structure-arrow">></div>

        <section class="structure-column ${focusKey === "feature" ? "is-emphasis" : ""}">
          <p class="structure-title">Feature extraction</p>
          <div class="feature-list">
            ${features
              .map(
                (feature) => `
                  <div class="feature-row">
                    <span class="feature-name">${feature.label}</span>
                    <div class="feature-bar-track">
                      <div class="feature-bar-fill" style="width:${feature.value}%"></div>
                    </div>
                    <span class="feature-score">${feature.value}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </section>

        <div class="structure-arrow">></div>

        <section class="structure-column ${focusKey === "roi" ? "is-emphasis" : ""}">
          <p class="structure-title">ROI scoring</p>
          <div class="roi-list">
            ${roiScores.map((roi) => renderRoiCard(roi, leadingRoi.id)).join("")}
          </div>
        </section>

        <div class="structure-arrow">></div>

        <section class="structure-column ${focusKey === "report" ? "is-emphasis" : ""}">
          <p class="structure-title">Report output</p>
          <div class="report-list">
            <div class="report-card">
              <span class="score-label">Selected ROI</span>
              <strong>${leadingRoi.label}</strong>
            </div>
            <div class="report-card">
              <span class="score-label">Positive area</span>
              <strong>${positiveArea}%</strong>
            </div>
            <div class="report-card">
              <span class="score-label">QC note</span>
              <strong>${qcNote}</strong>
            </div>
          </div>
        </section>
      </div>

      <div class="threshold-track structure-track">
        <div class="threshold-band"></div>
        <div class="threshold-marker" style="left:${marker}%"></div>
      </div>
      <p class="widget-note">As the threshold moves, different extracted features survive, which shifts ROI scoring and the final report recommendation.</p>
    `;
  }

  function computeFeatureValues(features, threshold) {
    return features.map((feature) => {
      const raw = feature.base - (threshold - 20) * feature.slope;
      return {
        id: feature.id,
        label: feature.label,
        value: clamp(Math.round(raw), 8, 96)
      };
    });
  }

  function computeRoiScores(rois, features) {
    return rois.map((roi) => {
      const contributionPairs = features.map((feature) => ({
        label: feature.label,
        value: Math.round(feature.value * roi.weights[feature.id])
      }));
      const dominant = contributionPairs.reduce((best, current) => (current.value > best.value ? current : best), contributionPairs[0]);
      const score = Math.round(contributionPairs.reduce((sum, item) => sum + item.value, 0) / contributionPairs.length);

      return {
        id: roi.id,
        label: roi.label,
        score,
        dominant
      };
    });
  }

  function renderPatchCard(patch, threshold) {
    return `
      <div class="patch-card">
        <span class="patch-label">${patch.label}</span>
        <div class="patch-grid">
          ${patch.values
            .map(
              (cell) =>
                `<span class="patch-cell ${cell >= threshold ? "is-active" : ""}" style="--cell-opacity:${Math.max(
                  0.22,
                  cell / 100
                )}"></span>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderRoiCard(roi, activeId) {
    return `
      <div class="roi-card ${roi.id === activeId ? "is-active" : ""}">
        <div class="roi-head">
          <span>${roi.label}</span>
          <strong>${roi.score}</strong>
        </div>
        <p class="roi-note">Dominant signal: ${roi.dominant.label}</p>
      </div>
    `;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  ns.widgets = {
    renderWidget
  };
})();
