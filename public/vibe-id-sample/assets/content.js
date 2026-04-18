window.resumeContent = {
  profile: {
    name: "Conglin (Duke) Ruan",
    summary:
      "AI Product Manager candidate who builds LLM systems, applied AI interfaces, and quantitative decision tools. My biostatistics background lets me define metrics, inspect failure modes, and communicate technical work to non-technical stakeholders.",
    location: "Minneapolis, MN",
    phone: "+1 651-280-7402",
    email: "ruanx070@umn.edu",
    website: "https://clruan.github.io",
    github: "https://github.com/clruan",
    scholar: "https://scholar.google.com/citations?user=0MH_0RAAAAAJ&hl=en&authuser=1"
  },
  strengths: [
    "LLM, retrieval, and workflow design experience with user-facing interfaces.",
    "Quantitative background in causal inference, survival analysis, mixed-effects models, and power analysis.",
    "Comfortable translating messy inputs into structured systems and measurable outputs.",
    "Experience communicating results through dashboards, reports, and interactive tools."
  ],
  results: [
    {
      value: "95%",
      label: "extraction accuracy",
      note: "GPT-based parsing with PII removal across 1,000+ documents."
    },
    {
      value: "1,400+",
      label: "job embeddings indexed",
      note: "Similarity search for consultant-job matching workflows."
    },
    {
      value: "80x",
      label: "runtime reduction",
      note: "Single-pass UK Biobank analysis on 5M+ features."
    },
    {
      value: "10+",
      label: "clinical studies advised",
      note: "Survival, causal, GEE, and mixed-effects support."
    }
  ],
  quantToolkit: [
    { label: "nDCG@k", relatedProjects: ["matching"] },
    { label: "Overlap@k", relatedProjects: ["matching"] },
    { label: "Retrieval quality", relatedProjects: ["matching", "graph"] },
    { label: "Top-k review", relatedProjects: ["matching"] },
    { label: "Survival analysis", relatedProjects: ["imaging"] },
    { label: "Causal inference", relatedProjects: [] },
    { label: "GEE", relatedProjects: [] },
    { label: "Mixed-effects models", relatedProjects: [] },
    { label: "Power analysis", relatedProjects: [] },
    { label: "Accuracy", relatedProjects: ["matching", "imaging"] },
    { label: "IoU", relatedProjects: ["imaging"] },
    { label: "Runtime reduction", relatedProjects: [] },
    { label: "QC checks", relatedProjects: ["imaging"] },
    { label: "Reproducible reporting", relatedProjects: ["imaging"] },
    { label: "Dashboards", relatedProjects: [] },
    { label: "Study design", relatedProjects: [] },
    { label: "Stakeholder communication", relatedProjects: ["graph"] }
  ],
  stack: [
    { id: "python", label: "Python", color: "#2563eb" },
    { id: "r", label: "R", color: "#2563eb" },
    { id: "spark", label: "Spark", color: "#f97316" },
    { id: "sql", label: "SQL", color: "#2563eb" },
    { id: "fastapi", label: "FastAPI", color: "#10b981" },
    { id: "react", label: "React", color: "#38bdf8" },
    { id: "nextjs", label: "Next.js", color: "#111827" },
    { id: "sveltekit", label: "SvelteKit", color: "#f97316" },
    { id: "pytorch", label: "PyTorch", color: "#f97316" },
    { id: "tableau", label: "Tableau", color: "#2563eb" },
    { id: "shiny", label: "R Shiny", color: "#60a5fa" },
    { id: "docker", label: "Docker", color: "#2563eb" },
    { id: "git", label: "Git", color: "#f97316" }
  ],
  experience: [
    {
      role: "Graduate Research Assistant",
      organization: "University of Minnesota Medical School",
      location: "Twin Cities",
      dates: "Aug 2024 - Present",
      bullets: [
        "Consulted on 10+ clinical studies, advising on survival analysis, causal inference, GEE, and mixed-effects models to maximize rigor from existing data.",
        "Developed a bio-imaging analytical agent for microscopy that automated reproducible reports and publication-ready figures, saving 2 months of labor per experiment.",
        "Trained deep learning segmentation models (U-Net, Med-SAM, DeepLabV3) for fibrosis and cell infiltration detection, achieving 0.82 IoU on histopathology images.",
        "Created interactive R Shiny dashboards to communicate statistical results to non-technical stakeholders, supporting study design and grant applications.",
        "Reduced UK Biobank brain imaging analysis runtime 80x on 5M+ features using Method-of-Moments single-pass estimator."
      ]
    },
    {
      role: "Machine Learning Engineer",
      organization: "MentorX",
      location: "Irvine, CA (Remote)",
      dates: "Feb 2026 - Present",
      bullets: [
        "Supported educational consulting by benchmarking embedding models and vector databases for consultant matching.",
        "Reached 95% extraction accuracy on 1,000+ documents by automating GPT-5 resume parsing and personally identifiable information removal.",
        "Streamlined consulting workflows by structuring resume and job data into standardized profiles for faster matching."
      ]
    },
    {
      role: "Researcher",
      organization: "University of Minnesota Medical School",
      location: "Twin Cities",
      dates: "Feb 2022 - Aug 2024",
      bullets: [
        "Applied mixed-effects models, survival methods, and longitudinal time-series analyses in R, PRISM, and Python, supporting 3 peer-reviewed publications in hematology.",
        "Delivered weekly clinical reports via dashboards and Tableau while enforcing HIPAA-aware handling and de-identification protocols.",
        "Reduced microscopy background noise 6x via deep learning, improving downstream data quality.",
        "Reached 97% classification accuracy on 20,000+ samples and saved 1 month of labor per experiment via automated cell-classification pipelines."
      ]
    }
  ],
  education: [
    {
      degree: "M.S. in Biostatistics",
      school: "University of Minnesota, Twin Cities",
      dates: "Expected May 2026",
      note: "Graduate Scholarship: $20,000 per year"
    },
    {
      degree: "B.S. in Statistical Science, Minor in Computer Science",
      school: "University of Minnesota, Twin Cities",
      dates: "Sep 2016 - May 2022",
      note: "Undergraduate Scholarship: $16,000 per year"
    }
  ],
  links: [
    {
      label: "Website",
      value: "clruan.github.io",
      href: "https://clruan.github.io"
    },
    {
      label: "GitHub",
      value: "github.com/clruan",
      href: "https://github.com/clruan"
    },
    {
      label: "Google Scholar",
      value: "View publications",
      href: "https://scholar.google.com/citations?user=0MH_0RAAAAAJ&hl=en&authuser=1"
    },
    {
      label: "Email",
      value: "ruanx070@umn.edu",
      href: "mailto:ruanx070@umn.edu"
    }
  ],
  projects: [
    {
      id: "matching",
      navTitle: "AI matching workflow",
      navMeta: "95% parsing accuracy | 1,400+ jobs indexed",
      title: "Resume and job matching for consultant workflows",
      source: "MentorX",
      summary:
        "This workflow turns resumes and job descriptions into structured profiles, then uses embeddings and ranking metrics to support faster consultant-job matching.",
      owned: [
        "Benchmarking embedding models and vector databases.",
        "Defining structured profile fields for resumes and jobs.",
        "Designing the review outputs and ranking metrics."
      ],
      metrics: [
        { label: "Accuracy", value: "95%" },
        { label: "Index", value: "1,400+ jobs" },
        { label: "Evaluation", value: "nDCG@k / Overlap@k" }
      ],
      relatedTech: ["python", "sql", "fastapi", "spark"],
      algorithmSummary:
        "The algorithm standardizes both sides of the market first, then retrieves and reranks matches so a human reviewer can inspect the shortlist instead of trusting a black box.",
      accent: "#0f766e",
      stages: [
        {
          label: "Parse",
          inputTitle: "Raw inputs",
          inputLines: ["Resume text", "Job description", "Consultant notes"],
          operationTitle: "Structure and sanitize",
          operationLines: ["GPT extraction", "PII removal", "Normalize titles, skills, and constraints"],
          outputTitle: "Profile objects",
          outputLines: ["Comparable fields", "Clean search records", "Structured filters"],
          pmNote: "A stable data contract made retrieval quality measurable and reviewable."
        },
        {
          label: "Embed",
          inputTitle: "Structured profiles",
          inputLines: ["Skills", "Experience", "Seniority", "Domain fit"],
          operationTitle: "Vectorize both sides",
          operationLines: ["Generate embeddings", "Store in vector index", "Track model and schema version"],
          outputTitle: "Searchable vectors",
          outputLines: ["Resume vectors", "Job vectors", "Indexed metadata"],
          pmNote: "Versioned embeddings helped keep experiments comparable across model choices."
        },
        {
          label: "Retrieve",
          inputTitle: "Query job",
          inputLines: ["Role requirements", "Preferred skills", "Constraints"],
          operationTitle: "Top-k retrieval",
          operationLines: ["Similarity search", "Metadata filtering", "Build initial shortlist"],
          outputTitle: "Candidate set",
          outputLines: ["Top-k matches", "Similarity scores", "Visible ranking rationale"],
          pmNote: "Showing the first-pass shortlist exposed whether retrieval was finding the right profile shape."
        },
        {
          label: "Review",
          inputTitle: "Shortlist",
          inputLines: ["Candidate scores", "Standardized profiles", "Reviewer context"],
          operationTitle: "Rerank and inspect",
          operationLines: ["Evaluate with nDCG@k", "Compare overlap across model variants", "Surface final review list"],
          outputTitle: "Consultant-facing view",
          outputLines: ["Ranked matches", "Metrics snapshot", "Faster manual review"],
          pmNote: "The review stage turned model output into an interface that consultants could trust."
        }
      ],
      widget: {
        type: "ranking",
        title: "Inspect the ranking behavior",
        help: "Switch the emphasis to see how the shortlist changes.",
        modes: [
          {
            id: "precision",
            label: "Precision",
            scoreName: "nDCG@10",
            scoreValue: 0.91,
            note: "Tighter shortlist for high-confidence matches.",
            ranking: [
              { label: "Senior Data Scientist", value: 92 },
              { label: "AI Solutions Analyst", value: 88 },
              { label: "ML Operations Lead", value: 78 }
            ]
          },
          {
            id: "balanced",
            label: "Balanced",
            scoreName: "nDCG@10",
            scoreValue: 0.86,
            note: "Balances relevance and coverage for consultant review.",
            ranking: [
              { label: "AI Solutions Analyst", value: 90 },
              { label: "Senior Data Scientist", value: 86 },
              { label: "Healthcare AI PM", value: 82 }
            ]
          },
          {
            id: "recall",
            label: "Recall",
            scoreName: "Overlap@10",
            scoreValue: 0.79,
            note: "Broader shortlist when exploration matters more.",
            ranking: [
              { label: "Healthcare AI PM", value: 84 },
              { label: "AI Solutions Analyst", value: 81 },
              { label: "Clinical Data Product Lead", value: 77 }
            ]
          }
        ]
      }
    },
    {
      id: "graph",
      navTitle: "Knowledge graph assistant",
      navMeta: "Traceable answers | clinician-facing UI",
      title: "Biomedical question answering with graph-grounded evidence",
      source: "University of Minnesota / KNOWNET work",
      summary:
        "This interface links language outputs back to biomedical entities and relationships so users can inspect why an answer was generated.",
      owned: [
        "Designing graph navigation and evidence panels.",
        "Improving node and edge highlighting for traceability.",
        "Making answer paths visible for clinician review."
      ],
      metrics: [
        { label: "Goal", value: "Traceable answers" },
        { label: "Interface", value: "Next.js + Flask" },
        { label: "Focus", value: "Human trust" }
      ],
      relatedTech: ["python", "react", "nextjs", "git"],
      algorithmSummary:
        "The system maps a question to biomedical entities, expands through the graph, and assembles an answer with visible evidence paths instead of returning ungrounded text alone.",
      accent: "#1d4ed8",
      stages: [
        {
          label: "Map",
          inputTitle: "Question",
          inputLines: ["Natural language query", "Clinical context", "Key terms"],
          operationTitle: "Entity mapping",
          operationLines: ["Extract concepts", "Resolve biomedical aliases", "Link into ontology nodes"],
          outputTitle: "Anchored entities",
          outputLines: ["Drug node", "Disease node", "Evidence target"],
          pmNote: "Users need to see how the system interpreted the question before trusting the answer."
        },
        {
          label: "Expand",
          inputTitle: "Anchored nodes",
          inputLines: ["Drug", "Disease", "Gene", "Pathway"],
          operationTitle: "Graph retrieval",
          operationLines: ["Expand neighborhood", "Filter relevant paths", "Preserve provenance"],
          outputTitle: "Evidence subgraph",
          outputLines: ["Connected nodes", "Candidate mechanisms", "Retrieved relations"],
          pmNote: "Exposing the retrieved subgraph makes the retrieval step auditable."
        },
        {
          label: "Assemble",
          inputTitle: "Evidence subgraph",
          inputLines: ["Relevant neighbors", "Supporting relations", "Clinical framing"],
          operationTitle: "Compose answer",
          operationLines: ["Summarize evidence", "Preserve key links", "Draft user-facing explanation"],
          outputTitle: "Grounded answer",
          outputLines: ["Natural language response", "Evidence references", "Visible assumptions"],
          pmNote: "The answer is stronger when it stays connected to explicit evidence objects."
        },
        {
          label: "Inspect",
          inputTitle: "Grounded answer",
          inputLines: ["Response text", "Nodes and edges", "User question"],
          operationTitle: "Interactive review",
          operationLines: ["Highlight path", "Open evidence panel", "Let users inspect alternatives"],
          outputTitle: "Traceable interface",
          outputLines: ["Highlighted graph path", "Explanation panel", "More trustworthy QA flow"],
          pmNote: "Trust improved when users could inspect the path, not just read the answer."
        }
      ],
      widget: {
        type: "graph",
        title: "Inspect the evidence path",
        help: "Change the focus to see which part of the graph becomes central.",
        nodes: [
          { id: "query", label: "Query", x: 12, y: 48 },
          { id: "drug", label: "Drug", x: 34, y: 20 },
          { id: "disease", label: "Disease", x: 66, y: 20 },
          { id: "gene", label: "Gene", x: 55, y: 72 },
          { id: "trial", label: "Trial", x: 86, y: 48 },
          { id: "answer", label: "Answer", x: 34, y: 82 }
        ],
        edges: [
          ["query", "drug"],
          ["query", "disease"],
          ["drug", "gene"],
          ["disease", "gene"],
          ["gene", "trial"],
          ["gene", "answer"],
          ["trial", "answer"]
        ],
        views: [
          {
            id: "drug",
            label: "Drug focus",
            note: "Starts from the intervention node and follows mechanism-related paths.",
            highlightNodes: ["query", "drug", "gene", "answer"],
            highlightEdges: ["query-drug", "drug-gene", "gene-answer"]
          },
          {
            id: "disease",
            label: "Disease focus",
            note: "Centers the disease context before composing the answer.",
            highlightNodes: ["query", "disease", "gene", "answer"],
            highlightEdges: ["query-disease", "disease-gene", "gene-answer"]
          },
          {
            id: "evidence",
            label: "Evidence focus",
            note: "Surfaces the supporting study path for inspection.",
            highlightNodes: ["gene", "trial", "answer"],
            highlightEdges: ["gene-trial", "trial-answer"]
          }
        ]
      }
    },
    {
      id: "imaging",
      navTitle: "Microscopy analysis agent",
      navMeta: "0.82 IoU | 2 months labor saved",
      title: "Microscopy analysis with segmentation, threshold sweeps, and reporting",
      source: "University of Minnesota Medical School",
      summary:
        "This workflow combines image preprocessing, deep learning segmentation, threshold exploration, and automated reporting so scientists can inspect stability before exporting a result.",
      owned: [
        "Designing the image-to-report workflow.",
        "Building threshold exploration for scientist review.",
        "Combining model outputs with quality control and reporting."
      ],
      metrics: [
        { label: "Impact", value: "2 months saved" },
        { label: "Model", value: "0.82 IoU" },
        { label: "Scope", value: "Segmentation + QC" }
      ],
      relatedTech: ["python", "pytorch", "r", "react"],
      algorithmSummary:
        "The algorithm processes multi-channel microscopy data through denoising and segmentation, then sweeps thresholds so scientists can see whether the result is stable before using it in downstream analysis.",
      accent: "#b45309",
      stages: [
        {
          label: "Ingest",
          inputTitle: "Raw image set",
          inputLines: ["Multi-channel microscopy", "Replicates", "Metadata"],
          operationTitle: "Normalize inputs",
          operationLines: ["Load channels", "Register metadata", "Prepare image stack"],
          outputTitle: "Analysis-ready images",
          outputLines: ["Consistent input format", "Linked sample metadata", "Reusable study setup"],
          pmNote: "Reliable ingestion mattered because downstream comparison depended on consistent sample handling."
        },
        {
          label: "Segment",
          inputTitle: "Analysis-ready images",
          inputLines: ["Signal channel", "Background channel", "Region masks"],
          operationTitle: "Denoise and segment",
          operationLines: ["Apply preprocessing", "Run U-Net or related model", "Generate candidate masks"],
          outputTitle: "Candidate structures",
          outputLines: ["Predicted regions", "Noise-reduced image", "Mask overlays"],
          pmNote: "Showing candidate masks made it easier to discuss failure modes with domain experts."
        },
        {
          label: "Sweep",
          inputTitle: "Candidate masks",
          inputLines: ["Threshold range", "Replicate curves", "Overlay previews"],
          operationTitle: "Threshold exploration",
          operationLines: ["Sweep threshold values", "Track positive area", "Highlight unstable regions"],
          outputTitle: "Stability view",
          outputLines: ["Threshold curve", "Suggested operating range", "QC note"],
          pmNote: "Interactive threshold sweeps converted a single opaque cutoff into a transparent decision."
        },
        {
          label: "Report",
          inputTitle: "Stable threshold choice",
          inputLines: ["Selected cutoff", "Replicate stats", "QC annotations"],
          operationTitle: "Compute and export",
          operationLines: ["Summarize features", "Compare groups", "Export report and figures"],
          outputTitle: "Shareable output",
          outputLines: ["Report package", "Figures", "Reproducible settings"],
          pmNote: "The reporting layer turned the analysis from a model output into a reusable workflow product."
        }
      ],
      widget: {
        type: "roi-structure",
        title: "Inspect threshold, features, and ROI structure",
        help: "Move the threshold and watch how extracted features change the ROI score and report output.",
        min: 20,
        max: 80,
        value: 46,
        patches: [
          { label: "Tile A", values: [84, 76, 64, 22, 88, 79, 60, 18, 92, 74, 58, 12, 66, 55, 38, 8] },
          { label: "Tile B", values: [30, 48, 72, 82, 34, 58, 80, 90, 18, 46, 76, 86, 12, 35, 64, 78] },
          { label: "Tile C", values: [10, 18, 34, 44, 22, 42, 61, 73, 32, 56, 79, 88, 28, 48, 70, 84] }
        ],
        features: [
          { id: "edge", label: "Edge density", base: 88, slope: 0.82 },
          { id: "texture", label: "Texture variance", base: 74, slope: 0.58 },
          { id: "clusters", label: "Cell clusters", base: 92, slope: 1.05 }
        ],
        rois: [
          { id: "lesion", label: "Lesion ROI", weights: { edge: 0.38, texture: 0.24, clusters: 0.56 } },
          { id: "boundary", label: "Boundary ROI", weights: { edge: 0.52, texture: 0.31, clusters: 0.22 } },
          { id: "stroma", label: "Stroma ROI", weights: { edge: 0.18, texture: 0.54, clusters: 0.26 } }
        ]
      }
    }
  ]
};
