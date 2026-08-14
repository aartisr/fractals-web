import type { DetectionResult } from '../../core/services/contracts'
import { formatTumorFractalDelta, tumorFractalEvidenceSources } from './tumorEvidence'
import type { FractalEvidence } from './useTumorFractalEvidence'

type TumorComplexityEvidencePanelProps = {
  detectionData: DetectionResult
  fractalEvidence: FractalEvidence
  strongestConfidence: string
}

export function TumorComplexityEvidencePanel({
  detectionData,
  fractalEvidence,
  strongestConfidence,
}: TumorComplexityEvidencePanelProps) {
  const hasComparableMeasurement = fractalEvidence.crop && fractalEvidence.source && fractalEvidence.delta !== null
  const quality = fractalEvidence.quality
  const isReliable = quality?.level === 'trusted'

  return (
    <section className="tumor-evidence-lab" aria-labelledby="complexity-evidence-title">
      <div className="tumor-evidence-lab-header">
        <div>
          <p className="tumor-evidence-kicker">Research demonstration</p>
          <h2 id="complexity-evidence-title">AI finds a region. Complexity describes its geometry.</h2>
          <p>
            This run keeps localization and morphology separate: the model proposes a candidate region, while fractal dimension
            measures the image structure within that region. Together, they form a testable research hypothesis—not a diagnosis.
          </p>
        </div>
        <span className={`tumor-evidence-verdict ${isReliable && hasComparableMeasurement ? 'is-ready' : 'is-caution'}`}>
          {isReliable && hasComparableMeasurement ? 'Measurement ready for research' : 'Do not interpret without validation'}
        </span>
      </div>

      <div className="tumor-evidence-chain" aria-label="Evidence chain">
        <article>
          <span>1</span>
          <strong>AI localization</strong>
          <p>{detectionData.detections.length} candidate region{detectionData.detections.length === 1 ? '' : 's'}; strongest model confidence {strongestConfidence}.</p>
        </article>
        <article>
          <span>2</span>
          <strong>Complexity measurement</strong>
          <p>
            {hasComparableMeasurement
              ? `Candidate D ${fractalEvidence.crop?.fractalDimension.toFixed(4)} versus whole-scan D ${fractalEvidence.source?.fractalDimension.toFixed(4)}.`
              : 'A comparable candidate-crop measurement was not produced or was withheld.'}
          </p>
        </article>
        <article>
          <span>3</span>
          <strong>Research question</strong>
          <p>Does this geometric feature improve a pre-specified task beyond AI localization alone in an external cohort?</p>
        </article>
      </div>

      <div className="tumor-evidence-metrics" aria-label="Complexity measurement">
        <div>
          <span>Candidate complexity</span>
          <strong>{fractalEvidence.crop ? fractalEvidence.crop.fractalDimension.toFixed(4) : 'Withheld'}</strong>
          <small>{fractalEvidence.crop ? `Fit R² ${fractalEvidence.crop.fitR2.toFixed(4)}` : 'No stable crop estimate'}</small>
        </div>
        <div>
          <span>Complexity difference</span>
          <strong>{fractalEvidence.delta === null ? 'Withheld' : formatTumorFractalDelta(fractalEvidence.delta)}</strong>
          <small>Candidate crop minus whole scan</small>
        </div>
        <div>
          <span>Measurement quality</span>
          <strong>{quality?.title ?? 'Not ready'}</strong>
          <small>{quality?.summary ?? fractalEvidence.message}</small>
        </div>
      </div>

      <div className="tumor-evidence-benefits">
        <div>
          <h3>Why measure complexity?</h3>
          <ul>
            <li>It makes geometric irregularity explicit, inspectable, and comparable across a defined protocol.</li>
            <li>It can be studied as a complementary feature instead of asking a black-box model to carry every inference.</li>
            <li>It enables longitudinal and cohort questions: how does morphology change, and does the signal replicate?</li>
          </ul>
        </div>
        <div className="tumor-evidence-limits">
          <h3>What this run cannot show</h3>
          <ul>
            <li>It cannot determine tumor type, grade, prognosis, or treatment.</li>
            <li>It does not validate the AI detection model or establish clinical utility.</li>
            <li>It uses a 2D image/crop workflow; clinical studies require defined MRI sequences, segmentations, and independent cohorts.</li>
          </ul>
        </div>
      </div>

      <details className="calm-disclosure tumor-validation-plan">
        <summary>What would prove added value</summary>
        <div className="calm-disclosure-content">
          <ol>
            <li>Pre-register one target task and a fixed FD/lacunarity extraction protocol before model training.</li>
            <li>Measure AI-only performance against AI-plus-complexity performance, including calibration and decision-curve utility.</li>
            <li>Test robustness to segmentation, scanner, sequence, site, and time; publish failures as well as successes.</li>
            <li>Validate once on a locked external cohort with expert reference labels before discussing clinical translation.</li>
          </ol>
          <p>Until those steps are completed, this is an educational research interface for hypothesis generation.</p>
        </div>
      </details>

      <details className="calm-disclosure tumor-evidence-sources">
        <summary>Peer-reviewed evidence and standards</summary>
        <div className="calm-disclosure-content">
          <ul>
            {tumorFractalEvidenceSources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                <span>{source.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  )
}
