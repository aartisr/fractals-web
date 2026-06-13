/**
 * webgl-renderer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GPU-accelerated fractal renderer using WebGL 1.0 fragment shaders.
 *
 * Architecture
 * ────────────
 * - A full-screen quad (two triangles) is drawn on each render call.
 * - The fragment shader runs one thread per pixel in parallel on the GPU.
 * - Fractal type, viewport, palette, iteration depth and Julia parameter are
 *   all passed as uniforms — so the shader does not need recompilation when
 *   the user changes parameters.
 *
 * Supported fractal types (u_type uniform)
 * ─────────────────────────────────────────
 *   0 = Mandelbrot    z ← z^p + c,  c = pixel
 *   1 = Julia         z ← z^p + c,  c = u_c uniform
 *   2 = Burning Ship  z ← |z|^p + c (absolute-value variant)
 *   3 = Newton        Newton–Raphson iteration for z^p = 1
 *
 * Plug-in contract
 * ────────────────
 * To add a new GPU-rendered fractal family:
 *   1. Add a new `u_type` integer constant below.
 *   2. Add the corresponding `else if(u_type==N){ … }` branch in FRAG_SRC.
 *   3. Register the type in GL_FRACTAL_TYPES.
 *   4. Add the fractal to FRACTAL_TYPES / ZOOMABLE_TYPES in fractal-types.ts.
 *
 * Colour palettes (u_scheme uniform)
 * ───────────────────────────────────
 * Palette integer IDs must stay in sync with GL_SCHEME_IDS in palettes.ts.
 * To add a palette: add an `else if(u_scheme==N){ … }` branch in FRAG_SRC
 * and update GL_SCHEME_IDS in palettes.ts.
 */

import type { FractalType } from '../../core/services/contracts'
import { GL_SCHEME_IDS } from './palettes'
import { clamp } from './viewport'
import type { RenderParams } from './fractal-types'
import type { Viewport } from './viewport'

// ── Shader sources ────────────────────────────────────────────────────────────

/** Minimal pass-through vertex shader — positions the full-screen quad. */
const VERT_SRC = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}`

/**
 * Fragment shader — executed once per pixel on the GPU.
 *
 * Helper functions:
 *   cpow(z, n)  — complex power z^n via polar form (handles non-integer n).
 *   cdiv(a, b)  — complex division a/b, guarded against zero denominator.
 *   pal(t)      — map normalised escape/convergence value to RGB via palette.
 *
 * Uniform interface:
 *   u_res     vec2   — canvas resolution in pixels (width, height).
 *   u_vmin    vec2   — viewport bottom-left (xMin, yMin) in world space.
 *   u_vmax    vec2   — viewport top-right (xMax, yMax) in world space.
 *   u_maxiter float  — iteration cap.
 *   u_type    int    — fractal family selector (see constants above).
 *   u_scheme  int    — palette selector (see GL_SCHEME_IDS in palettes.ts).
 *   u_power   float  — polynomial exponent / Newton degree.
 *   u_c       vec2   — Julia set parameter c = (Re, Im).
 */
const FRAG_SRC = `precision highp float;
uniform vec2 u_res;uniform vec2 u_vmin;uniform vec2 u_vmax;
uniform float u_maxiter;uniform int u_type;uniform int u_scheme;
uniform float u_power;uniform vec2 u_c;

/* Complex power z^n using polar form. Returns (0,0) near origin to avoid NaN. */
vec2 cpow(vec2 z,float n){float r=length(z);if(r<1e-12)return vec2(0.0);float a=atan(z.y,z.x);return pow(r,n)*vec2(cos(n*a),sin(n*a));}

/* Complex division a/b, denominator clamped to avoid divide-by-zero. */
vec2 cdiv(vec2 a,vec2 b){float d=max(dot(b,b),1e-24);return vec2(dot(a,b),a.y*b.x-a.x*b.y)/d;}

/* 5-stop linear palette.  t must be in [0,1]. A gamma of 0.55 lifts midtones. */
vec3 pal(float t){
  t=clamp(t,0.0,1.0);
  t=pow(t,0.55);
  vec3 c0,c1,c2,c3,c4;
  if(u_scheme==0){c0=vec3(0.000,0.000,0.020);c1=vec3(0.420,0.004,0.502);c2=vec3(0.870,0.180,0.180);c3=vec3(0.996,0.620,0.000);c4=vec3(1.000,0.980,0.700);}
  else if(u_scheme==1){c0=vec3(0.030,0.020,0.620);c1=vec3(0.580,0.000,0.820);c2=vec3(0.940,0.200,0.420);c3=vec3(0.990,0.660,0.100);c4=vec3(0.980,0.988,0.250);}
  else if(u_scheme==2){c0=vec3(0.050,0.000,0.100);c1=vec3(0.100,0.340,0.600);c2=vec3(0.050,0.700,0.600);c3=vec3(0.380,0.900,0.300);c4=vec3(0.980,0.980,0.100);}
  else if(u_scheme==3){c0=vec3(0.000,0.000,0.020);c1=vec3(0.380,0.040,0.560);c2=vec3(0.800,0.120,0.380);c3=vec3(0.990,0.580,0.200);c4=vec3(1.000,0.980,0.820);}
  else if(u_scheme==4){c0=vec3(0.000,0.133,0.306);c1=vec3(0.188,0.286,0.486);c2=vec3(0.337,0.424,0.510);c3=vec3(0.541,0.549,0.420);c4=vec3(0.992,0.914,0.271);}
  else if(u_scheme==5){c0=vec3(0.188,0.071,0.231);c1=vec3(0.176,0.427,0.831);c2=vec3(0.161,0.745,0.518);c3=vec3(0.961,0.824,0.251);c4=vec3(0.478,0.016,0.008);}
  else if(u_scheme==6){c0=vec3(0.000,0.000,0.000);c1=vec3(0.145,0.137,0.373);c2=vec3(0.373,0.435,0.529);c3=vec3(0.776,0.608,0.486);c4=vec3(1.000,1.000,1.000);}
  else if(u_scheme==7){c0=vec3(0.369,0.310,0.635);c1=vec3(0.196,0.533,0.741);c2=vec3(0.400,0.761,0.647);c3=vec3(0.988,0.553,0.349);c4=vec3(0.620,0.004,0.259);}
  else if(u_scheme==8){c0=vec3(0.227,0.298,0.753);c1=vec3(0.482,0.620,0.973);c2=vec3(0.867,0.867,0.867);c3=vec3(0.961,0.596,0.475);c4=vec3(0.706,0.016,0.149);}
  else if(u_scheme==9){c0=vec3(0.153,0.102,0.271);c1=vec3(0.353,0.227,0.478);c2=vec3(0.506,0.369,0.576);c3=vec3(0.733,0.525,0.635);c4=vec3(0.925,0.863,0.745);}
  else if(u_scheme==10){c0=vec3(0.000,0.082,0.224);c1=vec3(0.000,0.329,0.549);c2=vec3(0.000,0.549,0.651);c3=vec3(0.302,0.745,0.627);c4=vec3(0.859,0.949,1.000);}
  else if(u_scheme==11){c0=vec3(0.000,0.000,0.000);c1=vec3(0.373,0.027,0.078);c2=vec3(0.706,0.133,0.071);c3=vec3(0.961,0.478,0.039);c4=vec3(1.000,0.910,0.588);}
  else{c0=vec3(0.000,0.059,0.157);c1=vec3(0.000,0.282,0.471);c2=vec3(0.267,0.588,0.765);c3=vec3(0.627,0.863,0.941);c4=vec3(0.957,0.988,1.000);}
  if(t<0.25)return mix(c0,c1,t*4.0);
  if(t<0.50)return mix(c1,c2,(t-0.25)*4.0);
  if(t<0.75)return mix(c2,c3,(t-0.50)*4.0);
  return mix(c3,c4,(t-0.75)*4.0);
}
void main(){
  /* Map pixel to world coordinate. Y is flipped (WebGL origin = bottom-left). */
  vec2 uv=gl_FragCoord.xy/u_res;uv.y=1.0-uv.y;
  float re=u_vmin.x+uv.x*(u_vmax.x-u_vmin.x);
  float im=u_vmin.y+uv.y*(u_vmax.y-u_vmin.y);
  float maxI=u_maxiter;float p=u_power;float value=0.0;

  /* ── Newton fractal (u_type == 3) ───────────────────────────────────────── */
  if(u_type==3){
    vec2 z=vec2(re,im);
    float iterNorm=0.0;float converged=0.0;
    for(int i=0;i<8192;i++){
      if(float(i)>=maxI)break;
      vec2 fz=cpow(z,p)-vec2(1.0,0.0);
      vec2 dfz=p*cpow(z,p-1.0);
      if(dot(dfz,dfz)<1e-18)break;
      vec2 step=cdiv(fz,dfz);
      z-=step;
      if(dot(step,step)<1e-10||dot(fz,fz)<1e-6){
        iterNorm=1.0-float(i)/maxI;converged=1.0;break;
      }
    }
    float safeP=max(p,2.0);
    float angle=atan(z.y,z.x);
    float root=mod(floor((angle+3.14159265)/(6.28318530/safeP)),safeP);
    float rootFrac=(root+0.5)/safeP;
    value=(converged>0.5)?rootFrac*0.75+iterNorm*0.25:rootFrac*0.75+0.06;

  /* ── Escape-time fractals (u_type == 0, 1, 2) ───────────────────────────── */
  } else {
    vec2 z=(u_type==1)?vec2(re,im):vec2(0.0);
    vec2 cv=(u_type==1)?u_c:vec2(re,im);
    for(int i=0;i<8192;i++){
      if(float(i)>=maxI)break;
      float zr=z.x,zi=z.y;
      /* Burning Ship: fold both components into the positive half-plane. */
      if(u_type==2){zr=abs(zr);zi=abs(zi);}
      z=cpow(vec2(zr,zi),p)+cv;
      float r2=dot(z,z);
      if(r2>4.0){
        /* Smooth (continuous) iteration count removes discrete colour banding. */
        float r=sqrt(r2);
        float sm=float(i)+1.0-log(max(log(max(r,1.0001)),0.0001))/log(max(p,1.0001));
        value=clamp(sm/maxI,0.0,1.0);break;
      }
    }
  }
  /* Interior points (value == 0) are rendered as near-black. */
  vec3 col=pal(value);if(value==0.0)col=vec3(0.0,0.0,0.016);
  gl_FragColor=vec4(col,1.0);
}`

// ── Type for the compiled GL program state ────────────────────────────────────

/**
 * Compiled WebGL program and all resolved uniform locations.
 * Created once by `initGL` and reused for every subsequent render call.
 */
export type GLState = {
  gl: WebGLRenderingContext
  program: WebGLProgram
  u_res: WebGLUniformLocation
  u_vmin: WebGLUniformLocation
  u_vmax: WebGLUniformLocation
  u_maxiter: WebGLUniformLocation
  u_type: WebGLUniformLocation
  u_scheme: WebGLUniformLocation
  u_power: WebGLUniformLocation
  u_c: WebGLUniformLocation
}

// ── Fractal type → shader integer mapping ────────────────────────────────────

/**
 * Maps fractal type names to the `u_type` uniform integer used in FRAG_SRC.
 * Types not in this map are rendered on the Canvas 2D path (ifs-renderer.ts).
 */
export const GL_FRACTAL_TYPES: Partial<Record<FractalType, number>> = {
  Mandelbrot:    0,
  Julia:         1,
  'Burning Ship': 2,
  Newton:        3,
}

// ── Initialisation ────────────────────────────────────────────────────────────

/**
 * Compile shaders, link the GL program, upload a full-screen quad buffer, and
 * resolve all uniform locations.
 *
 * @param canvas - The HTMLCanvasElement that owns the WebGL context.
 * @returns Compiled GLState, or null if WebGL is unavailable or compilation fails.
 */
export const initGL = (canvas: HTMLCanvasElement): GLState | null => {
  const gl = (
    canvas.getContext('webgl', { preserveDrawingBuffer: true }) ??
    (canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true }) as WebGLRenderingContext | null)
  )
  if (!gl) return null

  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[WebGL] Shader compile error:', gl.getShaderInfoLog(s))
      return null
    }
    return s
  }

  const vert = compile(gl.VERTEX_SHADER, VERT_SRC)
  const frag = compile(gl.FRAGMENT_SHADER, FRAG_SRC)
  if (!vert || !frag) return null

  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vert)
  gl.attachShader(prog, frag)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[WebGL] Link error:', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)

  // Upload a full-screen quad as a triangle strip: two triangles covering NDC [-1,1]².
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const loc = (name: string) => gl.getUniformLocation(prog, name) as WebGLUniformLocation
  return {
    gl, program: prog,
    u_res: loc('u_res'),     u_vmin: loc('u_vmin'),     u_vmax: loc('u_vmax'),
    u_maxiter: loc('u_maxiter'), u_type: loc('u_type'), u_scheme: loc('u_scheme'),
    u_power: loc('u_power'), u_c: loc('u_c'),
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

/**
 * Upload uniforms and issue a single draw call.  Completes synchronously
 * (GPU work is enqueued and typically resolves within one display frame).
 *
 * @param state    - Compiled GL state from `initGL`.
 * @param params   - Current render parameters.
 * @param viewport - Current viewport (world-space rectangle).
 * @param maxIter  - Effective iteration cap (may be dynamically boosted in precision mode).
 */
export const renderWithGL = (
  state: GLState,
  params: RenderParams,
  viewport: Viewport,
  maxIter: number,
): void => {
  const { gl } = state
  const w = clamp(Math.round(params.width), 320, 2800)
  const h = clamp(Math.round(params.height), 220, 1800)
  const canvas = gl.canvas as HTMLCanvasElement

  // Resize canvas storage only when needed — resizing clears the framebuffer.
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }

  gl.viewport(0, 0, w, h)
  gl.uniform2f(state.u_res, w, h)
  gl.uniform2f(state.u_vmin, viewport.xMin, viewport.yMin)
  gl.uniform2f(state.u_vmax, viewport.xMax, viewport.yMax)
  gl.uniform1f(state.u_maxiter, clamp(maxIter, 16, 8192))
  gl.uniform1i(state.u_type, GL_FRACTAL_TYPES[params.type] ?? 0)
  gl.uniform1i(state.u_scheme, GL_SCHEME_IDS[params.colorScheme] ?? 0)
  gl.uniform1f(state.u_power, Math.max(2, Math.round(params.power ?? 2)))
  gl.uniform2f(state.u_c, params.cReal ?? -0.42, params.cImag ?? 0.6)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
