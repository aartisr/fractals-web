# Fractals Web Feature Strategy

Author: [Aarti S Ravikumar](https://ai-aarti.com) · [Pioneer Charter School of Science II](https://saugus.pioneercss.org)

This document turns Fractals Web into a research-grade learning studio for students, educators, and researchers.

The product thesis is simple:

- Students want something visual, interactive, and rewarding enough to keep exploring.
- Educators want something safe, structured, and easy to embed into instruction.
- Researchers want something reproducible, citeable, and exportable.

The winning product is not a single killer feature. It is a loop:

1. Explore a fractal or image analysis question.
2. Compare results.
3. Explain what changed.
4. Share the result.
5. Let someone else remix it.

That loop is what makes the app useful in class and contagious outside it.

## Why This Direction Fits Fractals Web

The current repo already has the right primitives:

- Fractal generation and research notes
- Box-counting analysis
- Image compare workflows
- Tumor detection and run history
- A module-driven app shell that can grow without collapsing into a single workflow

This means the next step is not “more charts.”
It is better packaging, better pedagogy, better reproducibility, and better sharing.

## Research Signals

The roadmap below is informed by a few strong patterns in current education and research tooling:

- Active, interactive learning consistently outperforms passive lecture in STEM contexts, and peer feedback strengthens learning and engagement.
- Educators are generally open to AI-enabled workflows, but they want clear boundaries, trust, and utility rather than novelty.
- Open science norms are rising: data and method sharing, reproducibility, and citation-friendly outputs are increasingly expected.
- LMS interoperability matters: tools that connect cleanly to classroom systems reduce teacher workload and increase adoption.

Relevant sources:

- 1EdTech LTI Advantage overview: https://www.1edtech.org/standards/lti
- Google Classroom developer docs: https://developers.google.com/workspace/classroom
- NIH Data Management & Sharing Policy overview: https://grants.nih.gov/policy-and-compliance/policy-topics/sharing-policies/dms/policy-overview
- Open science and citation effects study: https://arxiv.org/abs/2404.16171
- Open science link-sharing study: https://arxiv.org/abs/2310.03193
- GAIED survey: https://arxiv.org/abs/2402.01580
- Educator attitudes toward generative AI: https://arxiv.org/abs/2403.15586
- Visualization peer feedback study: https://arxiv.org/abs/2001.07549

## Product Principles

1. Make every result teachable.
2. Make every result shareable.
3. Make every result reproducible.
4. Make every result remixable.
5. Make the advanced path feel as easy as the beginner path.

## Audience Jobs To Be Done

### Students

Students are here to discover patterns, test ideas, and produce something they are proud to show.

They need:

- Fast visual feedback
- Guided exploration
- Low-friction comparison
- “Explain this” scaffolding
- Social proof that they are improving
- Shareable outputs for class, clubs, fairs, and portfolios

### Educators

Educators are here to teach concepts, assess understanding, and keep the workflow manageable.

They need:

- Lesson-ready templates
- Assignment and rubric support
- LMS-friendly distribution
- One-click share/export
- Safe interpretation language
- Class summaries and evidence of participation

### Researchers

Researchers are here to validate methods, compare cohorts, and communicate results clearly.

They need:

- Reproducible analysis settings
- Method/version capture
- Exportable figures and tables
- Data provenance
- Citation-ready reporting
- Comparison across images, cohorts, and conditions

## Feature Pillars

### 1. Fractal Studio for Students

This is the most viral surface area.

Build a guided, playful studio where users can:

- Explore Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, and Sierpinski Triangle
- Save interesting zooms and parameter states
- Compare variations side by side
- Switch palettes and iteration depth
- Get “why this looks this way” explanations in plain language
- Receive a share card for each interesting result

High-value additions:

- Challenge mode: “Can you find a mini-Mandelbrot copy?”
- Discovery feed: featured zooms and parameter sets from the community
- Remix button: clone any shared exploration and start from the same state
- Student badges: “Best zoom target,” “Cleanest explanation,” “Most interesting comparison”

Why this matters:

- Students stay longer when the app behaves like a playground, not a form.
- Shareable visual artifacts are the easiest path to organic distribution.

### 2. Classroom Mode for Educators

This is the adoption engine.

Build a teacher-facing layer that turns the app into a lesson tool.

Core capabilities:

- Assignment templates for introductory chaos, dimension, and image-comparison lessons
- Rubrics for reasoning, not just correctness
- Instructor dashboard with class progress and submission status
- Safe interpretation mode by default
- Slide-friendly summary cards for demos and lectures

Integration priorities:

- Google Classroom add-on support
- LTI Advantage launch/roster/grade workflows
- A lightweight “Share to Classroom” flow for assignments and exemplars

What this unlocks:

- Teachers can assign a comparison task without manual setup.
- Students can launch directly into the right activity.
- Results can return to the gradebook or course context without copy-paste.

### 3. Research Workbench

This is the credibility engine.

Turn existing analytics into a reproducible research workspace.

Core capabilities:

- Save a run with full parameter provenance
- Export CSV/JSON for box counts, fit metrics, and comparisons
- Generate a method card with image size, thresholding, box sizes, and fit quality
- Compare cohorts and annotate outliers
- Capture confidence and caveats alongside results
- Produce publication-ready figures with a single click

High-value additions:

- Versioned run bundles
- DOI-ready export package
- Citation block generator
- “Methods snapshot” that freezes every knob used in an analysis
- Cross-run diff view to show exactly what changed

Why this matters:

- Research users need trust more than novelty.
- The faster a user can turn an exploration into a documented method, the more often they will return.

### 4. Collaboration and Peer Review

This is the learning multiplier.

Peer feedback is a strong fit for visual and computational work because students can compare reasoning, not just answers.

Build:

- Comment-on-result threads tied to specific runs
- Structured peer-review rubrics
- “Explain your evidence” prompts
- Inline annotations for charts and overlays
- Shared classroom galleries with teacher moderation

Best use cases:

- Compare two images and justify the difference
- Review a classmate’s interpretation of fractal dimension
- Audit whether a tumor-related result is being over-claimed
- Discuss why two outputs look similar but behave differently

### 5. Shareability That Is Actually Useful

This is the viral layer, but it should feel academic and practical, not gimmicky.

Ship share formats that people naturally want to post:

- Public result links with read-only state
- Image cards for social sharing
- Embed snippets for blogs, lab pages, and course sites
- Short “result stories” for each run
- One-click export to slides or PDFs
- QR codes for classroom and conference use

Design rule:

- Every shareable output should include context, method, and caveat.
- If the artifact can spread, it should also remain scientifically honest.

## Viral Loops

The app should grow because people use it, not because it begs for attention.

### Loop A: Classroom Loop

1. Teacher assigns a comparison activity.
2. Students submit visually interesting results.
3. The teacher showcases the best examples.
4. Students share their own result cards.
5. New teachers discover the workflow from the shared artifacts.

### Loop B: Research Loop

1. Researcher exports a clean figure or method snapshot.
2. It appears in a paper, poster, or lab notebook.
3. Peers inspect the method and replicate the run.
4. The same artifact links back to the original workflow.

### Loop C: Community Loop

1. User shares a dramatic zoom or comparison.
2. Another user remixes it.
3. The remix surfaces as a new public artifact.
4. Both the original and remix attract new users.

## Feature Prioritization

### Phase 1: High Impact, Low Risk

- Shareable result cards
- Saved runs with provenance
- Class-friendly summaries
- Better compare templates
- Exportable figures and CSV
- Safe interpretation defaults

### Phase 2: Adoption and Retention

- Classroom templates
- Peer review and gallery workflows
- Google Classroom integration
- LTI launch and grade return
- Discovery feed for examples and challenges
- Bookmarkable lab pages for specific tasks

### Phase 3: Platform Strength

- Research bundles with versioning
- DOI-ready export packaging
- Public remixes and community library
- Cross-course assignment sharing
- Teacher analytics and cohort dashboards

## Suggested Metrics

Track success by audience, not just total traffic.

### Student Metrics

- Time to first meaningful result
- Number of remixes per shared artifact
- Save rate for interesting runs
- Return rate after first session

### Educator Metrics

- Assignment creation time
- Classroom/LMS launch success rate
- Submission completion rate
- Frequency of template reuse

### Research Metrics

- Export rate
- Reproducibility rate across repeated runs
- Citation or linkage rate from published work
- Public artifact reuse

## Safety and Trust

Because the app touches biomedical and educational workflows, trust has to be part of the product.

- Keep non-diagnostic framing prominent for medical imagery.
- Make thresholding and preprocessing visible.
- Distinguish between observation, interpretation, and conclusion.
- Preserve privacy controls for class and research data.
- Avoid dark-pattern sharing; make sharing deliberate and transparent.

## What Makes This Go Viral

The app becomes shareable when it produces:

- Beautiful visuals
- Clear explanations
- Credible methods
- Easy remixes
- Classroom-ready artifacts

That combination is rare.
Most tools do one of these well.
Fractals Web can do all five if we design it as a learning and research engine, not just a renderer.

## Recommended Next Build

If we want the fastest path to a breakout product, ship these in order:

1. Save and share run links with method snapshots.
2. Make compare results exportable as image cards and slide-ready summaries.
3. Add peer-review and remix workflows around shared artifacts.
4. Add educator templates and LMS integrations.
5. Add research-grade versioning and DOI-ready packaging.

## Existing Modules To Reuse

- `src/modules/fractals/`
- `src/modules/box-count/`
- `src/modules/compare/`
- `src/modules/tumor/`
- `src/modules/runs/`

These modules already map well to the product pillars above, so the implementation path should extend them rather than replace them.
