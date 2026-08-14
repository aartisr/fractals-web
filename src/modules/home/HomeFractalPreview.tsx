export function HomeFractalPreview() {
  return (
    <figure className="home-fractal-preview">
      <picture>
        <source media="(prefers-reduced-data: reduce)" srcSet="/og-preview.svg" type="image/svg+xml" />
        <source media="(max-width: 720px)" srcSet="/images/fractal-atmosphere-mobile.webp" type="image/webp" />
        <source srcSet="/images/fractal-atmosphere-wide.webp" type="image/webp" />
        <img
          src="/og-preview.svg"
          width="1440"
          height="480"
          alt="Abstract Mandelbrot-inspired fractal boundary"
          decoding="async"
        />
      </picture>
      <figcaption>
        <span className="home-preview-signal" aria-hidden="true" />
        One simple rule. Unbounded detail.
      </figcaption>
    </figure>
  )
}
