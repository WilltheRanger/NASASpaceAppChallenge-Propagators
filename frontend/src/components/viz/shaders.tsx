// WebGL shader layers for the Propagators site. Each falls back to a still image when WebGL is missing or
// the viewer prefers reduced motion; no number on the page depends on them.
import { useEffect, useRef, useState } from 'react'

const VS = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }'

function program(gl: WebGLRenderingContext, fs: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const pr = gl.createProgram()!
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(pr)
  gl.useProgram(pr)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(pr, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  return pr
}

function texture(gl: WebGLRenderingContext, unit: number, src: TexImageSource) {
  const t = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
  return t
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
const canAnimate = () => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** inferno colour map, decile stops (matplotlib) */
export const INFERNO = ['#000004', '#160b39', '#420a68', '#6a176e', '#932667', '#bc3754', '#dd513a', '#f37819', '#fca50a', '#f6d746', '#fcffa4']

/** A satellite scene rendered as a thermal false-colour field with a scan line sweeping across like a pass. */
export function ThermalField({ src, className = '', stillClassName = '' }: { src: string; className?: string; stillClassName?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const gl = cv.getContext('webgl', { premultipliedAlpha: false })
    if (!gl || !canAnimate()) { setFallback(true); return }
    let raf = 0, alive = true
    const FS = `precision mediump float; varying vec2 uv; uniform sampler2D img; uniform sampler2D ramp; uniform vec2 res; uniform vec2 ires; uniform float t;
    vec2 cover(vec2 u){ float ra = res.x / res.y, ri = ires.x / ires.y; vec2 s = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0); return (u - 0.5) * s + 0.5; }
    float fire(vec2 u){ vec3 c = texture2D(img, u).rgb; return smoothstep(0.12, 0.42, c.r - max(c.g, c.b)); }
    void main(){
      vec2 u = cover(vec2(uv.x, 1.0 - uv.y));
      vec3 c = texture2D(img, u).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      vec2 px = 1.0 / ires; float glow = 0.0;
      for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) glow += fire(u + vec2(float(i), float(j)) * px * 2.0);
      glow /= 25.0;
      float f = fire(u);
      float scan = fract(t * 0.05); float d = u.x - scan;
      float band = exp(-d * d * 1400.0) + 0.35 * exp(-d * d * 60.0) * step(d, 0.0);
      float v = clamp(0.06 + lum * 0.40 + glow * 1.6 + f * 0.55 + band * 0.10, 0.0, 1.0);
      vec3 col = texture2D(ramp, vec2(v, 0.5)).rgb + band * vec3(0.10, 0.12, 0.16);
      gl_FragColor = vec4(col, 1.0);
    }`
    try {
      const pr = program(gl, FS)
      const rc = document.createElement('canvas'); rc.width = 256; rc.height = 1
      const rx = rc.getContext('2d')!; const g = rx.createLinearGradient(0, 0, 256, 0)
      INFERNO.forEach((s, i) => g.addColorStop(i / 10, s)); rx.fillStyle = g; rx.fillRect(0, 0, 256, 1)
      texture(gl, 1, rc)
      loadImage(src).then((im) => {
        if (!alive) return
        texture(gl, 0, im)
        gl.uniform1i(gl.getUniformLocation(pr, 'img'), 0)
        gl.uniform1i(gl.getUniformLocation(pr, 'ramp'), 1)
        gl.uniform2f(gl.getUniformLocation(pr, 'ires'), im.width, im.height)
        const uRes = gl.getUniformLocation(pr, 'res'), uT = gl.getUniformLocation(pr, 't')
        const t0 = performance.now()
        const frame = (now: number) => {
          const k = Math.min(window.devicePixelRatio || 1, 1.5)
          const w = Math.round(cv.clientWidth * k), h = Math.round(cv.clientHeight * k)
          if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h) }
          gl.uniform2f(uRes, w, h)
          gl.uniform1f(uT, (now - t0) / 1000 + 6)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
          raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
      }).catch(() => setFallback(true))
    } catch { setFallback(true) }
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [src])
  if (fallback) return <img src={src} alt="" aria-hidden className={stillClassName} style={{ filter: 'grayscale(1) brightness(0.55) sepia(0.6) hue-rotate(-20deg) saturate(2)' }} />
  return <canvas ref={ref} aria-hidden className={className} />
}

/** Wipe between real captures of one place taken at different look times. `time` in hours. */
export function ThreeClocksWipe({ srcs, stops, time, tints, className = '', alt }: { srcs: string[]; stops: number[]; time: number; tints: [number, number, number][]; className?: string; alt: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const state = useRef<{ gl: WebGLRenderingContext; pr: WebGLProgram; tex: WebGLTexture[]; w: number; h: number } | null>(null)
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const gl = cv.getContext('webgl')
    if (!gl) { setFallback(true); return }
    const FS = `precision mediump float; varying vec2 uv; uniform sampler2D a; uniform sampler2D b; uniform float k; uniform vec2 res; uniform vec2 ires; uniform vec3 tint;
    vec2 cover(vec2 u){ float ra = res.x/res.y, ri = ires.x/ires.y; vec2 s = ra > ri ? vec2(1., ri/ra) : vec2(ra/ri, 1.); return (u-0.5)*s+0.5; }
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    void main(){ vec2 u = cover(vec2(uv.x, 1.-uv.y));
      float along = u.x*0.82 + u.y*0.18 + (n(u*7.)-0.5)*0.08;
      float e = smoothstep(k-0.025, k+0.025, along);
      vec3 c = mix(texture2D(b,u).rgb, texture2D(a,u).rgb, e);
      c += exp(-pow((along-k)*55., 2.)) * tint * 0.55;
      gl_FragColor = vec4(c, 1.); }`
    let alive = true
    try {
      const pr = program(gl, FS)
      Promise.all(srcs.map(loadImage)).then((ims) => {
        if (!alive) return
        const tex = ims.map((im, i) => texture(gl, i % 2, im)!)
        state.current = { gl, pr, tex, w: ims[0].width, h: ims[0].height }
        cv.dispatchEvent(new Event('ready'))
      }).catch(() => setFallback(true))
    } catch { setFallback(true) }
    return () => { alive = false }
  }, [srcs])

  useEffect(() => {
    const cv = ref.current
    const draw = () => {
      const s = state.current
      if (!cv || !s) return
      const { gl, pr, tex } = s
      const w = cv.clientWidth, h = cv.clientHeight
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
      gl.viewport(0, 0, w, h)
      const i = time <= stops[1] ? 0 : 1
      const f = Math.min(1, Math.max(0, (time - stops[i]) / (stops[i + 1] - stops[i])))
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[i])
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[i + 1])
      gl.uniform1i(gl.getUniformLocation(pr, 'b'), 0)
      gl.uniform1i(gl.getUniformLocation(pr, 'a'), 1)
      gl.uniform1f(gl.getUniformLocation(pr, 'k'), 1.05 - f * 1.1)
      gl.uniform3fv(gl.getUniformLocation(pr, 'tint'), tints[i + 1])
      gl.uniform2f(gl.getUniformLocation(pr, 'res'), w, h)
      gl.uniform2f(gl.getUniformLocation(pr, 'ires'), s.w, s.h)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    draw()
    cv?.addEventListener('ready', draw)
    window.addEventListener('resize', draw)
    return () => { cv?.removeEventListener('ready', draw); window.removeEventListener('resize', draw) }
  }, [time, stops, tints])

  const nearest = time <= (stops[0] + stops[1]) / 2 ? 0 : time <= (stops[1] + stops[2]) / 2 ? 1 : 2
  if (fallback) return <img src={srcs[nearest]} alt={alt} className={className} style={{ objectFit: 'cover' }} />
  return <canvas ref={ref} role="img" aria-label={alt} className={className} />
}
