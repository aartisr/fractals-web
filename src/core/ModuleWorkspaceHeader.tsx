import type { CSSProperties } from 'react'
import type { WorkbenchModule } from './plugins/types'

/**
 * A registry-driven orientation layer shared by every workbench module.
 * Keeping the purpose and three-step workflow with the module metadata makes
 * new modules self-describing instead of requiring page-specific chrome.
 */
export function ModuleWorkspaceHeader({ module }: { module: WorkbenchModule }) {
  return (
    <section
      className="workspace-header module-workspace-header"
      aria-labelledby={`module-${module.id}-title`}
      style={{ '--module-accent': module.accent } as CSSProperties}
    >
      <p className="workspace-overline">{module.navLabel} · a clear three-step workflow</p>
      <div className="module-workspace-copy">
        <h1 id={`module-${module.id}-title`}>{module.title}</h1>
        <p>{module.workflow.purpose}</p>
      </div>
      <ol className="workspace-facts" aria-label={`${module.title} workflow`}>
        {module.workflow.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
      </ol>
    </section>
  )
}
