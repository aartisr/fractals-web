import { FractalPreset } from '../types';

export const FRACTAL_PRESETS: FractalPreset[] = [
  {
    id: 'mandelbrot-classic',
    name: 'Mandelbrot Canonical Horizon',
    type: 'mandelbrot',
    centerX: -0.7,
    centerY: 0.0,
    zoom: 1.0,
    maxIterations: 250,
    colorScheme: 'cosmic',
    description: 'The archetype of complex dynamical systems. z_{n+1} = z_n^2 + c.'
  },
  {
    id: 'mandelbrot-seahorse',
    name: 'Seahorse Valley Spirals',
    type: 'mandelbrot',
    centerX: -0.7436438870371587,
    centerY: 0.131825904205312,
    zoom: 2400.0,
    maxIterations: 600,
    colorScheme: 'gold',
    description: 'Intricate logarithmic spiral vortex between main cardioid and period-2 bulb.'
  },
  {
    id: 'mandelbrot-elephant',
    name: 'Elephant Valley Filaments',
    type: 'mandelbrot',
    centerX: 0.285,
    centerY: 0.013,
    zoom: 180.0,
    maxIterations: 450,
    colorScheme: 'thermal',
    description: 'Self-similar elephant trunk cascades along the eastern boundary.'
  },
  {
    id: 'julia-rabbit',
    name: "Douady's Rabbit (Julia)",
    type: 'julia',
    centerX: 0.0,
    centerY: 0.0,
    zoom: 1.2,
    maxIterations: 300,
    juliaCr: -0.123,
    juliaCi: 0.745,
    colorScheme: 'ocean',
    description: 'Triple-fold rotational symmetry with connected parabolic fixed points.'
  },
  {
    id: 'julia-dendrite',
    name: 'San Marco & Dendrite (Julia)',
    type: 'julia',
    centerX: 0.0,
    centerY: 0.0,
    zoom: 1.2,
    maxIterations: 400,
    juliaCr: -0.75,
    juliaCi: 0.11,
    colorScheme: 'turbo',
    description: 'Dendritic tree-like Julia filament network on boundary of connectivity.'
  },
  {
    id: 'burningship-mast',
    name: 'Burning Ship Fractal',
    type: 'burningship',
    centerX: -0.45,
    centerY: -0.5,
    zoom: 1.5,
    maxIterations: 350,
    colorScheme: 'thermal',
    description: 'Non-analytic absolute coordinate map: z_{n+1} = (|Re(z)| + i|Im(z)|)^2 + c.'
  },
  {
    id: 'newton-basins',
    name: 'Newton-Raphson Basins (z³ - 1 = 0)',
    type: 'newton',
    centerX: 0.0,
    centerY: 0.0,
    zoom: 1.2,
    maxIterations: 60,
    colorScheme: 'cosmic',
    description: 'Dynamical basins of attraction converging to cube roots of unity.'
  }
];

const VERTEX_SHADER_SRC = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform int u_maxIterations;
uniform int u_fractalType; // 0: Mandelbrot, 1: Julia, 2: Burning Ship, 3: Newton
uniform vec2 u_juliaC;
uniform int u_colorScheme; // 0: cosmic, 1: gold, 2: thermal, 3: ocean, 4: obsidian, 5: turbo

// Cosine gradient color generator
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.2831853 * (c * t + d));
}

vec3 getColor(float t, int scheme) {
  if (scheme == 0) {
    // Cosmic Neon
    return palette(t, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.33, 0.67));
  } else if (scheme == 1) {
    // Electric Gold
    return palette(t, vec3(0.5, 0.4, 0.2), vec3(0.5, 0.4, 0.2), vec3(1.0, 0.7, 0.4), vec3(0.1, 0.2, 0.3));
  } else if (scheme == 2) {
    // Thermal Infrared
    return palette(t, vec3(0.8, 0.5, 0.4), vec3(0.2, 0.4, 0.2), vec3(2.0, 1.0, 1.0), vec3(0.0, 0.25, 0.25));
  } else if (scheme == 3) {
    // Deep Ocean
    return palette(t, vec3(0.1, 0.3, 0.5), vec3(0.3, 0.5, 0.7), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.5, 0.8));
  } else if (scheme == 4) {
    // Obsidian Monochrome
    float g = clamp(t, 0.0, 1.0);
    return vec3(g * 0.9 + 0.05);
  } else {
    // Turbo High-Frequency
    return palette(t * 2.0, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.1, 0.2));
  }
}

void main() {
  vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  
  // Coordinate mapping
  vec2 c = u_center + (st * 3.0) / u_zoom;
  vec2 z = c;

  if (u_fractalType == 1) {
    // Julia set: z starts at pixel coordinate, c is fixed
    z = c;
    c = u_juliaC;
  }

  int iter = 0;
  float r2 = 0.0;
  float smoothIter = 0.0;

  if (u_fractalType == 0) {
    // Mandelbrot: z_{n+1} = z_n^2 + c
    for (int i = 0; i < 2000; i++) {
      if (i >= u_maxIterations) break;
      r2 = z.x * z.x + z.y * z.y;
      if (r2 > 4.0) {
        iter = i;
        break;
      }
      z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
    }
  } else if (u_fractalType == 1) {
    // Julia set
    for (int i = 0; i < 2000; i++) {
      if (i >= u_maxIterations) break;
      r2 = z.x * z.x + z.y * z.y;
      if (r2 > 4.0) {
        iter = i;
        break;
      }
      z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
    }
  } else if (u_fractalType == 2) {
    // Burning Ship: z_{n+1} = (|Re(z)| + i|Im(z)|)^2 + c
    for (int i = 0; i < 2000; i++) {
      if (i >= u_maxIterations) break;
      r2 = z.x * z.x + z.y * z.y;
      if (r2 > 4.0) {
        iter = i;
        break;
      }
      vec2 absZ = vec2(abs(z.x), abs(z.y));
      z = vec2(absZ.x * absZ.x - absZ.y * absZ.y + c.x, -2.0 * absZ.x * absZ.y + c.y);
    }
  } else if (u_fractalType == 3) {
    // Newton-Raphson for f(z) = z^3 - 1 = 0
    // z_{n+1} = z_n - (z_n^3 - 1)/(3*z_n^2) = (2*z_n^3 + 1)/(3*z_n^2)
    vec2 root1 = vec2(1.0, 0.0);
    vec2 root2 = vec2(-0.5, 0.8660254);
    vec2 root3 = vec2(-0.5, -0.8660254);
    
    vec2 currentZ = c;
    int rootIdx = 0;

    for (int i = 0; i < 150; i++) {
      if (i >= u_maxIterations) break;
      
      // z^2
      float z2x = currentZ.x * currentZ.x - currentZ.y * currentZ.y;
      float z2y = 2.0 * currentZ.x * currentZ.y;
      
      // z^3
      float z3x = z2x * currentZ.x - z2y * currentZ.y;
      float z3y = z2x * currentZ.y + z2y * currentZ.x;

      // num = z^3 - 1
      vec2 num = vec2(z3x - 1.0, z3y);
      // den = 3 * z^2
      vec2 den = 3.0 * vec2(z2x, z2y);
      
      float denMag2 = den.x * den.x + den.y * den.y;
      if (denMag2 < 0.000001) break;

      // step = num / den
      vec2 step = vec2(
        (num.x * den.x + num.y * den.y) / denMag2,
        (num.y * den.x - num.x * den.y) / denMag2
      );

      currentZ -= step;

      // Check convergence to roots
      if (length(currentZ - root1) < 0.001) { rootIdx = 1; iter = i; break; }
      if (length(currentZ - root2) < 0.001) { rootIdx = 2; iter = i; break; }
      if (length(currentZ - root3) < 0.001) { rootIdx = 3; iter = i; break; }
    }

    if (rootIdx == 1) fragColor = vec4(0.9, 0.2, 0.3, 1.0) * (1.0 - float(iter) / float(u_maxIterations));
    else if (rootIdx == 2) fragColor = vec4(0.2, 0.8, 0.4, 1.0) * (1.0 - float(iter) / float(u_maxIterations));
    else if (rootIdx == 3) fragColor = vec4(0.2, 0.5, 0.95, 1.0) * (1.0 - float(iter) / float(u_maxIterations));
    else fragColor = vec4(0.05, 0.05, 0.08, 1.0);
    return;
  }

  // Interior points
  if (r2 <= 4.0) {
    fragColor = vec4(0.02, 0.03, 0.06, 1.0);
    return;
  }

  // Böttcher Renormalized Continuous Escape Time Formula
  // nu = i + 1 - log(log(|z|)) / log(2)
  smoothIter = float(iter) + 1.0 - log(0.5 * log(r2)) / 0.69314718056;
  float t = smoothIter / float(u_maxIterations);
  
  vec3 rgb = getColor(t * 3.5, u_colorScheme);
  fragColor = vec4(rgb, 1.0);
}
`;

export interface RenderProfile {
  fps: number;
  frameTimeMs: number;
  megaOpsPerSec: number;
  megaPixelsPerSec: number;
  gpuVendor: string;
  gpuRenderer: string;
  resolution: string;
}

export class WebGLFractalRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation> = {};
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private currentFps = 60;
  private lastFpsUpdate = performance.now();

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initGL();
  }

  private initGL(): boolean {
    const gl = this.canvas.getContext('webgl2', {
      antialias: false,
      depth: false,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    }) as WebGL2RenderingContext;

    if (!gl) {
      console.warn('WebGL 2.0 not available on this client device.');
      return false;
    }
    this.gl = gl;

    // Compile vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER_SRC);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('VS Error:', gl.getShaderInfoLog(vs));
      return false;
    }

    // Compile fragment shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FRAGMENT_SHADER_SRC);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('FS Error:', gl.getShaderInfoLog(fs));
      return false;
    }

    // Link Program
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link Error:', gl.getProgramInfoLog(prog));
      return false;
    }
    this.program = prog;

    // Cache Uniform Locations
    gl.useProgram(prog);
    const uniformNames = [
      'u_resolution',
      'u_center',
      'u_zoom',
      'u_maxIterations',
      'u_fractalType',
      'u_juliaC',
      'u_colorScheme'
    ];
    for (const name of uniformNames) {
      const loc = gl.getUniformLocation(prog, name);
      if (loc) this.uniforms[name] = loc;
    }

    // Fullscreen Quad
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0
    ]);
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    return true;
  }

  public render(
    centerX: number,
    centerY: number,
    zoom: number,
    maxIterations: number,
    fractalType: 'mandelbrot' | 'julia' | 'burningship' | 'newton',
    colorScheme: string,
    juliaCr: number = -0.123,
    juliaCi: number = 0.745
  ): RenderProfile {
    const gl = this.gl;
    if (!gl || !this.program) {
      return {
        fps: 0,
        frameTimeMs: 0,
        megaOpsPerSec: 0,
        megaPixelsPerSec: 0,
        gpuVendor: 'N/A',
        gpuRenderer: 'N/A',
        resolution: '0x0'
      };
    }

    const t0 = performance.now();

    // Check canvas resize
    const displayWidth = this.canvas.clientWidth || 512;
    const displayHeight = this.canvas.clientHeight || 512;
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);

    // Set Uniforms
    if (this.uniforms.u_resolution) {
      gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    }
    if (this.uniforms.u_center) {
      gl.uniform2f(this.uniforms.u_center, centerX, centerY);
    }
    if (this.uniforms.u_zoom) {
      gl.uniform1f(this.uniforms.u_zoom, zoom);
    }
    if (this.uniforms.u_maxIterations) {
      gl.uniform1i(this.uniforms.u_maxIterations, maxIterations);
    }

    const typeInt = fractalType === 'mandelbrot' ? 0 : fractalType === 'julia' ? 1 : fractalType === 'burningship' ? 2 : 3;
    if (this.uniforms.u_fractalType) {
      gl.uniform1i(this.uniforms.u_fractalType, typeInt);
    }

    if (this.uniforms.u_juliaC) {
      gl.uniform2f(this.uniforms.u_juliaC, juliaCr, juliaCi);
    }

    const schemeMap: Record<string, number> = {
      cosmic: 0,
      gold: 1,
      thermal: 2,
      ocean: 3,
      obsidian: 4,
      turbo: 5
    };
    if (this.uniforms.u_colorScheme) {
      gl.uniform1i(this.uniforms.u_colorScheme, schemeMap[colorScheme] ?? 0);
    }

    // Draw fullscreen strip
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const t1 = performance.now();
    const frameTimeMs = Math.max(0.05, t1 - t0);

    // Update FPS Counter
    this.frameCount++;
    if (t1 - this.lastFpsUpdate >= 400) {
      this.currentFps = Math.round((this.frameCount * 1000) / (t1 - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = t1;
    }

    // Calculate throughput metrics
    const pixelCount = this.canvas.width * this.canvas.height;
    const megaPixelsPerSec = (pixelCount / (frameTimeMs / 1000)) / 1_000_000;
    // Estimated complex operations per frame
    const estimatedOps = pixelCount * (maxIterations * 0.4) * 8; // ~8 FLOP per iteration
    const megaOpsPerSec = (estimatedOps / (frameTimeMs / 1000)) / 1_000_000;

    // Extract GPU Hardware Strings
    const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuVendor = dbgExt ? gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL) : 'Standard WebGL';
    const gpuRenderer = dbgExt ? gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) : 'Hardware Accelerator';

    return {
      fps: this.currentFps,
      frameTimeMs: parseFloat(frameTimeMs.toFixed(2)),
      megaOpsPerSec: Math.round(megaOpsPerSec),
      megaPixelsPerSec: parseFloat(megaPixelsPerSec.toFixed(1)),
      gpuVendor: String(gpuVendor),
      gpuRenderer: String(gpuRenderer),
      resolution: `${this.canvas.width}x${this.canvas.height}`
    };
  }

  public destroy(): void {
    if (!this.gl) return;
    if (this.program) this.gl.deleteProgram(this.program);
    if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
    this.gl = null;
  }
}
