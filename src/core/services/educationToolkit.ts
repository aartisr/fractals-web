import type { WorkbenchMetric } from './workbenchSharing'

export type ClassroomModuleId = 'fractals' | 'box-count' | 'compare' | 'tumor-detection'

export type ClassroomChecklistItem = {
  label: string
  complete: boolean
  detail?: string
}

export type ClassroomTemplate = {
  title: string
  teacherGoal: string
  studentGoal: string
  assignmentPrompt: string
  steps: string[]
  rubric: Array<{ label: string; description: string }>
  safetyNote: string
}

export type ClassroomStatus = {
  submissionStatus: 'not-started' | 'in-progress' | 'ready-to-submit' | 'submitted'
  progressLabel: string
  summary: string
  checklist: ClassroomChecklistItem[]
  metrics: WorkbenchMetric[]
}

const safeStatusLabel: Record<ClassroomStatus['submissionStatus'], string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'ready-to-submit': 'Ready to submit',
  submitted: 'Submitted',
}

export const CLASSROOM_TEMPLATES: Record<ClassroomModuleId, ClassroomTemplate> = {
  fractals: {
    title: 'Fractal Exploration Lesson',
    teacherGoal: 'Help students connect iteration rules, scale, and self-similarity.',
    studentGoal: 'Find a visually interesting fractal view and explain what changed as you zoomed or changed parameters.',
    assignmentPrompt: 'Choose a fractal family, explore at least two parameter settings, and explain the structural differences in one paragraph.',
    steps: [
      'Pick a fractal family and start from the default view.',
      'Change one variable at a time and note the visual effect.',
      'Capture your best view and write a short explanation.',
      'Share the result card with a classmate or teacher.',
    ],
    rubric: [
      { label: 'Observation', description: 'Describes what changed using clear visual evidence.' },
      { label: 'Reasoning', description: 'Links the change to iteration depth, zoom, or parameter choice.' },
      { label: 'Communication', description: 'Uses complete sentences and precise vocabulary.' },
    ],
    safetyNote: 'This is a teaching tool for patterns and self-similarity, not a proof of anything outside the model.',
  },
  'box-count': {
    title: 'Box-Counting Lab',
    teacherGoal: 'Show how image complexity can be approximated with box counting.',
    studentGoal: 'Place a region of interest, run the analysis, and explain how scale affects the estimate.',
    assignmentPrompt: 'Select an ROI, run box counting, and report D, R², and what the scaling plot suggests about the image.',
    steps: [
      'Upload an image and place the ROI.',
      'Run the analysis and inspect the scaling plot.',
      'Collect at least two samples if the teacher asks for a comparison.',
      'Use the share card to submit your final result.',
    ],
    rubric: [
      { label: 'Method', description: 'Uses a clear ROI and reports the chosen scale ladder.' },
      { label: 'Evidence', description: 'Includes D, R², and the box-count trend.' },
      { label: 'Interpretation', description: 'Explains the result without over-claiming.' },
    ],
    safetyNote: 'Treat the estimate as a structural descriptor, not a diagnosis or verdict.',
  },
  compare: {
    title: 'Image Comparison Lesson',
    teacherGoal: 'Help students compare multiple images using the same preprocessing pipeline.',
    studentGoal: 'Compare at least two images and explain which one is structurally more complex.',
    assignmentPrompt: 'Upload two to five images, compare them, and defend your ranking with the log-log plot and QC status.',
    steps: [
      'Upload a matched set of images.',
      'Keep labels and preprocessing consistent.',
      'Run the comparison and inspect the fit quality.',
      'Use the report template to explain your conclusion.',
    ],
    rubric: [
      { label: 'Consistency', description: 'Uses comparable inputs and labels.' },
      { label: 'Analysis', description: 'Interprets D and R² together.' },
      { label: 'Communication', description: 'Writes a balanced result summary with caveats.' },
    ],
    safetyNote: 'Comparison is a discussion aid; it should not be framed as a medical conclusion.',
  },
  'tumor-detection': {
    title: 'Safe Biomarker Discussion',
    teacherGoal: 'Demonstrate careful interpretation of model output and supporting evidence.',
    studentGoal: 'Review the detection output, confidence, and fractal evidence without over-stating what the model knows.',
    assignmentPrompt: 'Run detection, compare the candidate overlay with the source scan, and describe the evidence in classroom-safe language.',
    steps: [
      'Upload a scan and select a view.',
      'Run detection and inspect the confidence summary.',
      'Compare the annotated output with the original scan.',
      'Write a cautious explanation using the result card.',
    ],
    rubric: [
      { label: 'Evidence use', description: 'Uses the overlay, confidence, and fractal evidence appropriately.' },
      { label: 'Safety language', description: 'Avoids diagnostic claims and stays descriptive.' },
      { label: 'Reflection', description: 'Explains limits, uncertainty, and next steps.' },
    ],
    safetyNote: 'Educational support only. Students should keep language descriptive and defer to expert review.',
  },
}

export const buildClassroomStatus = (
  moduleId: ClassroomModuleId,
  metrics: WorkbenchMetric[],
  checklist: ClassroomChecklistItem[],
  override?: Partial<ClassroomStatus>,
): ClassroomStatus => {
  const completeCount = checklist.filter((item) => item.complete).length
  const submissionStatus =
    override?.submissionStatus ??
    (completeCount === 0 ? 'not-started' : completeCount < checklist.length ? 'in-progress' : 'ready-to-submit')

  return {
    submissionStatus,
    progressLabel: override?.progressLabel ?? `${completeCount}/${checklist.length} complete`,
    summary:
      override?.summary ??
      `${CLASSROOM_TEMPLATES[moduleId].title} is ${safeStatusLabel[submissionStatus].toLowerCase()}.`,
    checklist,
    metrics,
  }
}

export const buildHandoutMarkdown = (
  moduleId: ClassroomModuleId,
  status: ClassroomStatus,
  extraNotes: string[] = [],
) => {
  const template = CLASSROOM_TEMPLATES[moduleId]
  const rubric = template.rubric.map((item) => `- ${item.label}: ${item.description}`).join('\n')
  const checklist = status.checklist.map((item) => `- [${item.complete ? 'x' : ' '}] ${item.label}${item.detail ? ` — ${item.detail}` : ''}`).join('\n')
  const metrics = status.metrics.map((metric) => `- ${metric.label}: ${metric.value}${metric.detail ? ` (${metric.detail})` : ''}`).join('\n')

  return [
    `# ${template.title}`,
    '',
    `Teacher goal: ${template.teacherGoal}`,
    `Student goal: ${template.studentGoal}`,
    '',
    `Assignment prompt: ${template.assignmentPrompt}`,
    '',
    'Steps:',
    ...template.steps.map((step) => `- ${step}`),
    '',
    'Rubric:',
    rubric,
    '',
    `Submission status: ${status.progressLabel}`,
    `Summary: ${status.summary}`,
    '',
    'Checklist:',
    checklist,
    '',
    'Key metrics:',
    metrics,
    '',
    `Safety note: ${template.safetyNote}`,
    ...extraNotes.map((note) => `- ${note}`),
  ]
    .filter(Boolean)
    .join('\n')
}

export const buildSlideSummaryMarkdown = (
  moduleId: ClassroomModuleId,
  status: ClassroomStatus,
  highlights: string[],
) => {
  const template = CLASSROOM_TEMPLATES[moduleId]
  return [
    `# ${template.title} - Slide Summary`,
    '',
    `Teacher goal: ${template.teacherGoal}`,
    `Status: ${status.progressLabel}`,
    '',
    'Highlights:',
    ...highlights.map((item) => `- ${item}`),
    '',
    'Evidence:',
    ...status.metrics.map((metric) => `- ${metric.label}: ${metric.value}`),
    '',
    `Safety: ${template.safetyNote}`,
  ].join('\n')
}

export const defaultChecklistStatus = (items: string[]): ClassroomChecklistItem[] =>
  items.map((label) => ({
    label,
    complete: false,
  }))

