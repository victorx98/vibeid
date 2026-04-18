(function () {
  const ns = window.aiResume || (window.aiResume = {});

  function create(data) {
    return {
      activeProjectId: data.projects[0].id,
      hoverProjectId: null,
      activeStageByProject: Object.fromEntries(data.projects.map((project) => [project.id, 0])),
      rankingModeByProject: { matching: "balanced" },
      graphViewByProject: { graph: "evidence" },
      thresholdByProject: { imaging: 46 }
    };
  }

  function getProjectById(data, projectId) {
    return data.projects.find((project) => project.id === projectId);
  }

  function getActiveProject(data, state) {
    return getProjectById(data, state.activeProjectId);
  }

  function getHighlightedTechIds(data, state) {
    const projectId = state.hoverProjectId || state.activeProjectId;
    const project = getProjectById(data, projectId);
    return new Set(project ? project.relatedTech : []);
  }

  ns.state = {
    create,
    getActiveProject,
    getHighlightedTechIds
  };
})();
