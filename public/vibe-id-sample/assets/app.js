(function () {
  const ns = window.aiResume;
  const data = window.resumeContent;
  const state = ns.state.create(data);

  function renderStaticSections() {
    ns.renderStatic.renderHeader(data);
    ns.renderStatic.renderSidebar(data, state);
    ns.renderStatic.renderResults(data);
    ns.renderStatic.renderExperience(data);
    ns.renderStatic.renderEducation(data);
    ns.renderStatic.renderLinks(data);
  }

  function updateSidebarHighlights() {
    ns.renderStatic.renderStackList(data, state);
    ns.renderStatic.renderQuantGrid(data, state);
  }

  function renderProjectListAndDetail() {
    ns.renderProjects.renderProjectList(data, state, {
      onSelect(projectId) {
        state.activeProjectId = projectId;
        renderProjectListAndDetail();
      },
      onHover(projectId) {
        state.hoverProjectId = projectId;
        updateSidebarHighlights();
      },
      onLeave() {
        state.hoverProjectId = null;
        updateSidebarHighlights();
      }
    });

    ns.renderProjects.renderProjectDetail(data, state, {
      onStageChange(projectId, stageIndex) {
        state.activeStageByProject[projectId] = stageIndex;
        renderProjectDetailOnly();
      },
      onRankingModeChange(projectId, modeId) {
        state.rankingModeByProject[projectId] = modeId;
        renderProjectDetailOnly();
      },
      onGraphViewChange(projectId, viewId) {
        state.graphViewByProject[projectId] = viewId;
        renderProjectDetailOnly();
      },
      onThresholdChange(projectId, value) {
        state.thresholdByProject[projectId] = value;
        renderProjectDetailOnly();
      }
    });

    updateSidebarHighlights();
  }

  function renderProjectDetailOnly() {
    ns.renderProjects.renderProjectDetail(data, state, {
      onStageChange(projectId, stageIndex) {
        state.activeStageByProject[projectId] = stageIndex;
        renderProjectDetailOnly();
      },
      onRankingModeChange(projectId, modeId) {
        state.rankingModeByProject[projectId] = modeId;
        renderProjectDetailOnly();
      },
      onGraphViewChange(projectId, viewId) {
        state.graphViewByProject[projectId] = viewId;
        renderProjectDetailOnly();
      },
      onThresholdChange(projectId, value) {
        state.thresholdByProject[projectId] = value;
        renderProjectDetailOnly();
      }
    });

    updateSidebarHighlights();
  }

  function init() {
    renderStaticSections();
    renderProjectListAndDetail();
  }

  init();
})();
