import { useMutation } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { Panel } from '../../components/Panel'
import type { FractalType } from '../../core/services/contracts'
import { api } from '../../core/services/api'

const fractalTypes: FractalType[] = [
  'Mandelbrot',
  'Julia',
  'Burning Ship',
  'Newton',
  'Barnsley Fern',
  'Sierpinski Triangle',
]

export function FractalsPage() {
  const generateMutation = useMutation({
    mutationFn: api.generateFractal,
  })

  const form = useForm({
    defaultValues: {
      type: 'Mandelbrot' as FractalType,
      width: 800,
      height: 600,
      maxIter: 256,
      colorScheme: 'inferno',
      power: 2,
      cReal: -0.42,
      cImag: 0.6,
    },
    onSubmit: async ({ value }) => {
      await generateMutation.mutateAsync(value)
    },
  })

  return (
    <div className="tool-grid">
      <Panel title="Fractal Generator" subtitle="Fast path to visual complexity experiments.">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.Field
            name="type"
            children={(field) => (
              <label className="field">
                <span>Fractal Type</span>
                <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value as FractalType)}>
                  {fractalTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            )}
          />

          <form.Field
            name="width"
            children={(field) => (
              <label className="field">
                <span>Width</span>
                <input
                  type="number"
                  min={256}
                  max={2048}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </label>
            )}
          />

          <form.Field
            name="height"
            children={(field) => (
              <label className="field">
                <span>Height</span>
                <input
                  type="number"
                  min={256}
                  max={2048}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </label>
            )}
          />

          <form.Field
            name="maxIter"
            children={(field) => (
              <label className="field">
                <span>Max Iterations</span>
                <input
                  type="number"
                  min={16}
                  max={2000}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </label>
            )}
          />

          <form.Field
            name="power"
            children={(field) => (
              <label className="field">
                <span>Power</span>
                <input type="number" step="0.1" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
              </label>
            )}
          />

          <form.Field
            name="colorScheme"
            children={(field) => (
              <label className="field">
                <span>Color Scheme</span>
                <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)}>
                  <option value="inferno">inferno</option>
                  <option value="plasma">plasma</option>
                  <option value="viridis">viridis</option>
                  <option value="magma">magma</option>
                </select>
              </label>
            )}
          />

          <button className="action" type="submit" disabled={generateMutation.isPending}>
            {generateMutation.isPending ? 'Generating...' : 'Generate Fractal'}
          </button>
        </form>
      </Panel>

      <Panel title="Result" subtitle="Generated artifact and reproducible metadata.">
        {generateMutation.data ? (
          <div className="result-stack">
            <img src={generateMutation.data.imageUrl} alt="Generated fractal" className="result-image" />
            <pre>{JSON.stringify(generateMutation.data.metadata, null, 2)}</pre>
          </div>
        ) : (
          <p className="muted">Generate a fractal to preview image output and metadata.</p>
        )}
      </Panel>
    </div>
  )
}
