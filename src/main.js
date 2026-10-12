import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { forceSimulation, forceLink, forceManyBody, forceRadial } from 'd3-force-3d';
import T from './theme.js';

/* ---------- constants. Look and pacing live in theme.js; what stays here is behaviour. ---------- */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const SMALL = Math.min(innerWidth, innerHeight) < 700;
const DUST = SMALL || !FINE ? 5200 : 14000;
const CENTER = new THREE.Vector3(0, 0, -160); // the universe sits behind the wordmark; the camera flies through
const FOV = 50;
// The track behind the universe: the release node it belongs to and the file. Without the file the player stays hidden.
const TRACK = { node: 'birdhouse', bpm: 123, bars: 16, src: (import.meta.env.DEV && new URLSearchParams(location.search).get('track')) || '/audio/birdhouse.mp3' };
const AUTO_AFTER = 6000; // ms without input before the dissolve starts on its own
const AUTO_DURATION = 7; // s for a full dissolve when nobody scrolls
const FOCUS_DURATION = RM ? 0 : 1.2;
const E = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const restDist = () => (innerWidth / innerHeight < 1 ? 215 : 150);

const $ = id => document.getElementById(id);
const body = document.body;

/* ---------- data. Every node and edge is sourced; the JSON is the only source of content. ---------- */
const dataP = Promise.all([
  fetch('/data/nodes.json').then(r => r.json()),
  fetch('/data/edges.json').then(r => r.json()),
]);
const fontP = Promise.race([
  Promise.all([document.fonts.load(`800 120px "${T.fonts.display}"`), document.fonts.load(`10px "${T.fonts.mono}"`)]),
  new Promise(r => setTimeout(r, 1200)),
]).catch(() => {});

/* ---------- theme → CSS custom properties ---------- */
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
{
  const st = document.documentElement.style;
  st.setProperty('--bg', T.bg); st.setProperty('--fg', T.fg);
  st.setProperty('--dim', rgba(T.fg, T.dim)); st.setProperty('--line', rgba(T.fg, T.line));
  st.setProperty('--accent', T.accent); st.setProperty('--accent-2', T.accent2); st.setProperty('--index-hover', T.indexHover); st.setProperty('--index-dim', rgba(T.bg, T.indexDim));
  st.setProperty('--display', `'${T.fonts.display}',system-ui,sans-serif`); st.setProperty('--mono', `'${T.fonts.mono}',ui-monospace,Menlo,monospace`);
  const fl = $('fonts'); if (fl && fl.href !== T.fonts.href) fl.href = T.fonts.href;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', T.bg);
}

/* ---------- renderer ---------- */
const canvas = $('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch {
  renderer = null;
}
let W = innerWidth, H = innerHeight;
let PR = Math.min(devicePixelRatio || 1, 1.5);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 8000);
const pxPerUnit = () => H / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))); // CSS px per world unit at depth 1
const col = c => new THREE.Color(c); // sRGB hex → linear working colour

/* ---------- nebula: slow 3D fbm on the view direction, a skybox that never ends ---------- */
const nebulaMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false,
  uniforms: { uTime: { value: 0 }, uA: { value: col(T.nebula.a) }, uB: { value: col(T.nebula.b) }, uBase: { value: col(T.nebula.base) }, uAAmt: { value: T.nebula.aAmount }, uBAmt: { value: T.nebula.bAmount } },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
  fragmentShader: /* glsl */`
    uniform float uTime, uAAmt, uBAmt; uniform vec3 uA, uB, uBase; varying vec3 vDir;
    float h(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float n(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float v = 0., s = .5; for (int i = 0; i < 4; i++){ v += s * n(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); s *= .5; } return v; }
    void main(){
      vec3 d = normalize(vDir); float t = uTime * .01;
      vec3 q = vec3(fbm(d * 2.1 + t), fbm(d * 2.1 - t + 3.1), fbm(d * 2.1 + vec3(5.2, 1.3, t)));
      float f = fbm(d * 2.4 + 1.7 * q);
      vec3 c = uBase;
      c += uA * pow(f, 3.2) * uAAmt;
      c += uB * pow(1. - f, 7.) * uBAmt;
      gl_FragColor = vec4(c, 1.);
    }`,
});
const nebula = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), nebulaMat);
nebula.renderOrder = -1;
nebula.frustumCulled = false;
scene.add(nebula);

/* ---------- wordmark: text drawn once, sampled into points with a little real depth ---------- */
function sampleWordmark(count, twoLines) {
  const cw = 2048, ch = twoLines ? 1000 : 400;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d', { willReadFrequently: true });
  const lines = twoLines ? ['CONNECTING', 'DOTS'] : ['CONNECTING DOTS'];
  let size = twoLines ? 300 : 200;
  g.font = `800 ${size}px Unbounded, system-ui, sans-serif`;
  const widest = Math.max(...lines.map(l => g.measureText(l).width));
  if (widest > cw * .94) { size *= cw * .94 / widest; g.font = `800 ${size}px Unbounded, system-ui, sans-serif`; }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.12));
  const d = g.getImageData(0, 0, cw, ch).data;
  const pts = [];
  let minX = cw, maxX = 0;
  for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) {
    if (d[(y * cw + x) * 4 + 3] > 140) { pts.push(x, y); if (x < minX) minX = x; if (x > maxX) maxX = x; }
  }
  const span = Math.max(1, maxX - minX), cx = (minX + maxX) / 2;
  const out = new Float32Array(count * 2);
  const n = pts.length / 2;
  for (let i = 0; i < count; i++) {
    const k = n ? (Math.random() * n) | 0 : 0;
    out[i * 2] = n ? (pts[k * 2] - cx + (Math.random() - .5) * 1.6) / span : (Math.random() - .5);
    out[i * 2 + 1] = n ? -(pts[k * 2 + 1] - ch / 2 + (Math.random() - .5) * 1.6) / span : 0;
  }
  return out;
}

/* ---------- dust: thousands of points that are the wordmark first and stardust after ---------- */
const dustGeo = new THREE.BufferGeometry();
const dStart = new Float32Array(DUST * 3), dEnd = new Float32Array(DUST * 3), dRand = new Float32Array(DUST * 4);
for (let i = 0; i < DUST; i++) {
  // the shell around the universe: sparse inside, dense and deep outside
  const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  const r = Math.random() < .12 ? 70 + Math.random() * 160 : 260 + 1100 * Math.pow(Math.random(), 1.2); // a little dust among the nodes, the rest deep outside the orbit
  dEnd[i * 3] = CENTER.x + s * Math.cos(a) * r;
  dEnd[i * 3 + 1] = CENTER.y + u * r * .8;
  dEnd[i * 3 + 2] = CENTER.z + s * Math.sin(a) * r;
  dRand[i * 4] = Math.random(); dRand[i * 4 + 1] = Math.random(); dRand[i * 4 + 2] = Math.random(); dRand[i * 4 + 3] = Math.random();
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dStart, 3)); // start = the wordmark
dustGeo.setAttribute('aEnd', new THREE.BufferAttribute(dEnd, 3));
dustGeo.setAttribute('aRand', new THREE.BufferAttribute(dRand, 4));
let wordWidth = 0, twoLineMode = null;
function layoutWordmark() {
  const aspect = W / H;
  const two = aspect < 1;
  const visW = 2 * 100 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect;
  wordWidth = Math.min(visW * (two ? .84 : .8), 132);
  if (two !== twoLineMode) { twoLineMode = two; wordmarkSamples = sampleWordmark(DUST, two); }
  for (let i = 0; i < DUST; i++) {
    dStart[i * 3] = wordmarkSamples[i * 2] * wordWidth;
    dStart[i * 3 + 1] = wordmarkSamples[i * 2 + 1] * wordWidth;
    dStart[i * 3 + 2] = (dRand[i * 4 + 3] - .5) * 2.6 + (dRand[i * 4 + 1] - .5) * (dRand[i * 4 + 2] < .05 ? 14 : 0); // a few strays float off the letters
  }
  dustGeo.attributes.position.needsUpdate = true;
}
let wordmarkSamples = null;
dustGeo.boundingSphere = new THREE.Sphere(CENTER.clone(), 4000);

const dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: {
    uP: { value: 0 }, uTime: { value: 0 }, uPR: { value: PR }, uScale: { value: 1 }, uFocus: { value: 100 }, uBreath: { value: RM ? 0 : 1 }, uAudio: { value: new THREE.Vector3() }, uBreathSpeed: { value: new THREE.Vector2(T.breath.depth, T.breath.scale) },
    uTintShare: { value: new THREE.Vector2(T.dustTintAShare, T.dustTintAShare + T.dustTintBShare) },
    uFg: { value: col(T.dust) }, uA: { value: col(T.dustTintA) }, uB: { value: col(T.dustTintB) },
  },
  vertexShader: /* glsl */`
    uniform float uP, uTime, uPR, uScale, uFocus, uBreath; uniform vec2 uBreathSpeed, uTintShare; uniform vec3 uFg, uA, uB, uAudio; // audio: bass, mid, high
    attribute vec3 aEnd; attribute vec4 aRand;
    varying float vA; varying vec3 vC; varying float vSoft;
    void main(){
      float k = clamp((uP - aRand.x * .38) / .62, 0., 1.);
      float e = k < .5 ? 4. * k * k * k : 1. - pow(-2. * k + 2., 3.) / 2.;
      vec3 s = position;
      s.z += sin(uTime * uBreathSpeed.x + aRand.w * 6.2832) * .45 * uBreath;           // the wordmark breathes
      s.xy *= 1. + sin(uTime * uBreathSpeed.y) * .006 * uBreath;
      vec3 p = mix(s, aEnd, e);
      float sw = sin(e * 3.14159);                                             // a soft swirl mid-flight
      p += sw * vec3(sin(aRand.w * 40. + e * 4.), cos(aRand.y * 37. + e * 3.), sin(aRand.z * 29. + e * 2.)) * 22.;
      p += e * uBreath * vec3(sin(uTime * .05 + aRand.w * 30.), cos(uTime * .04 + aRand.y * 20.), sin(uTime * .045 + aRand.x * 25.)) * 3.;
      p += e * uBreath * normalize(p - vec3(0., 0., -160.) + .001) * uAudio.x * (2. + aRand.y * 5.); // the bass breathes the whole space
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      float depth = max(-mv.z, .5);
      float blur = clamp(abs(depth - uFocus) / (uFocus * 1.4), 0., 1.);        // cheap depth of field
      float world = mix(.2 + aRand.y * .2, .18 + aRand.y * .42, e) * mix(1., 1.5, blur);
      float px = world * uScale / depth;
      float floorPx = 1.;
      vA = (px < floorPx ? px / floorPx : 1.) * mix(.95, .5, blur) * mix(.85, .22 + aRand.z * .38, e);
      vA *= smoothstep(4., 40., depth);                                       // no blobs as the camera passes through
      vA *= 1. + e * (uAudio.x * .6 + uAudio.z * 2.2 * pow(.5 + .5 * sin(uTime * 9. + aRand.w * 60.), 6.)); // highs make the dust glitter
      gl_PointSize = max(px, floorPx) * uPR;
      vSoft = blur;
      vec3 tint = aRand.z < uTintShare.x ? uA : aRand.z < uTintShare.y ? uB : uFg;
      vC = mix(uFg, tint, e);
    }`,
  fragmentShader: /* glsl */`
    varying float vA; varying vec3 vC; varying float vSoft;
    void main(){
      float d = length(gl_PointCoord - .5) * 2.;
      float a = exp(-d * d * mix(5.5, 2.6, vSoft)) * (1. - smoothstep(.75, 1., d));
      gl_FragColor = vec4(vC, a * vA);
    }`,
});
const dust = new THREE.Points(dustGeo, dustMat);
dust.frustumCulled = false;
scene.add(dust);

/* ---------- state ---------- */
let NODES = [], REL = {}, nodes = [], N = {}, edges = [], adj = {};
let selected = null, hovered = null;
let p = 0, pTarget = 0, live = false, auto = false, lastInput = performance.now();
const cam = { target: new THREE.Vector3(), dist: 100, distT: 100, theta: 0, phi: 0, vTheta: 0, vPhi: 0, offX: 0, offY: 0, q: new THREE.Quaternion() };
// The orbit is a free rotation (quaternion), not longitude/latitude: dragging turns the space endlessly in every direction, no poles.
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), qStep = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
function orbit(yaw, pitch) { // in the camera's own frame: yaw around its up, pitch around its right
  if (yaw) cam.q.multiply(qStep.setFromAxisAngle(AY, yaw));
  if (pitch) cam.q.multiply(qStep.setFromAxisAngle(AX, -pitch));
  cam.q.normalize();
}
let tween = null; // { from: Vector3, node|null, t, dur, distFrom, distTo }
let lastInteract = 0;
const pointer = { x: -1, y: -1, sx: -1, sy: -1, inside: false, type: 'mouse' };

/* ---------- graph objects ---------- */
let nodeGeo, nodeMat, nodePoints, edgeGeo, edgeMat, edgeLines;
let nPos, nSize, nColor, nAlpha, nRing, ePos, eCol;

function buildGraph(nodesData, edgeData) {
  NODES = nodesData; REL = edgeData.relations;
  adj = {}; NODES.forEach(n => (adj[n.id] = []));
  edgeData.edges.forEach(([a, b, r]) => { adj[a].push({ to: b, v: REL[r][0] }); adj[b].push({ to: a, v: REL[r][1] }); });

  nodes = NODES.map((d, i) => ({
    d, i, id: d.id, base: new THREE.Vector3(), pos: new THREE.Vector3(), start: new THREE.Vector3(),
    fan: 0, hot: 0, dim: 0, scr: { x: -1e4, y: -1e4, ok: false, depth: 1 },
    phase: Math.random() * 100, children: [], parentN: null, depth: 0,
    tier: d.hub ? 0 : d.ring === 1 ? 1 : d.parent ? 3 : 2,
  }));
  N = Object.fromEntries(nodes.map(n => [n.id, n]));
  nodes.forEach(n => { if (n.d.parent && N[n.d.parent]) { n.parentN = N[n.d.parent]; n.parentN.children.push(n); } });
  nodes.forEach(n => { let k = n; while (k.parentN) { n.depth++; k = k.parentN; } });

  // 3D force layout for the top level: Mino fixed at the centre, partners near, labels further out
  const top = nodes.filter(n => !n.parentN);
  const sim = top.map(n => ({ id: n.id, tier: n.tier, ...(n.tier === 0 ? { fx: 0, fy: 0, fz: 0 } : {}) }));
  const ids = new Set(top.map(n => n.id));
  const links = edgeData.edges.filter(([a, b]) => ids.has(a) && ids.has(b)).map(([a, b]) => ({ source: a, target: b }));
  const S = Object.fromEntries(sim.map(s => [s.id, s]));
  const linkDist = l => { const t = [S[l.source.id ?? l.source].tier, S[l.target.id ?? l.target].tier].sort(); return t[0] === 0 ? (t[1] === 1 ? 24 : 56) : t[0] === 1 && t[1] === 1 ? 22 : 36; };
  const s3 = forceSimulation(sim, 3)
    .force('link', forceLink(links).id(d => d.id).distance(linkDist).strength(.5))
    .force('charge', forceManyBody().strength(-110))
    .force('radial', forceRadial(d => (d.tier === 0 ? 0 : d.tier === 1 ? 24 : 62)).strength(.35))
    .stop();
  for (let i = 0; i < 400; i++) s3.tick();
  let maxR = 1; sim.forEach(s => (maxR = Math.max(maxR, Math.hypot(s.x, s.y, s.z))));
  const k = 74 / maxR;
  sim.forEach(s => N[s.id].base.set(s.x * k, s.y * k * .85, s.z * k));

  // satellites: a tight cluster around the parent, fanned out on a sphere when in focus
  nodes.forEach(n => {
    const m = n.children.length;
    n.children.forEach((c, j) => {
      const y = 1 - (j + .5) / m * 2, r = Math.sqrt(1 - y * y), th = j * 2.39996 + n.phase;
      c.fanDir = new THREE.Vector3(Math.cos(th) * r, y * .8, Math.sin(th) * r).multiplyScalar(n.tier === 0 ? 16 + m * .45 : 9 + m * .7);
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      c.restDir = new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a)).multiplyScalar((n.tier === 0 ? 4.2 : 2.6) + Math.random() * 1.8);
      c.orbit = (Math.random() < .5 ? -1 : 1) * (.05 + Math.random() * .08);
    });
  });
  nodes.sort((a, b) => a.depth - b.depth); // parents update before children
  nodes.forEach(n => { const k2 = (Math.random() * DUST) | 0; n.start.set(dStart[k2 * 3], dStart[k2 * 3 + 1], dStart[k2 * 3 + 2]); });

  edges = edgeData.edges.map(([a, b, r]) => ({ a: N[a], b: N[b], r, lit: 0 })).filter(e => e.a && e.b);

  // node points
  const C = nodes.length;
  nodeGeo = new THREE.BufferGeometry();
  nPos = new Float32Array(C * 3); nSize = new Float32Array(C); nColor = new Float32Array(C * 3); nAlpha = new Float32Array(C); nRing = new Float32Array(C);
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nSize, 1));
  nodeGeo.setAttribute('aColor', new THREE.BufferAttribute(nColor, 3));
  nodeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(nAlpha, 1));
  nodeGeo.setAttribute('aRing', new THREE.BufferAttribute(nRing, 1));
  nodes.forEach(n => (nRing[n.i] = n.d.archive ? 1 : 0));
  nodeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPR: { value: PR }, uScale: { value: 1 } },
    vertexShader: /* glsl */`
      uniform float uPR, uScale; attribute float aSize, aAlpha, aRing; attribute vec3 aColor;
      varying vec3 vC; varying float vA, vRing;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        gl_Position = projectionMatrix * mv;
        float depth = max(-mv.z, .5);
        float px = aSize * uScale / depth;
        gl_PointSize = clamp(px, 3., 90.) * uPR;
        vC = aColor; vA = aAlpha * smoothstep(1., 8., depth); vRing = aRing;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC; varying float vA, vRing;
      void main(){
        float d = length(gl_PointCoord - .5) * 2.;
        float core = smoothstep(.42, .26, d);
        float ring = smoothstep(.1, .0, abs(d - .36)) * .9;
        float halo = exp(-d * d * 7.) * .35;
        float a = mix(core, ring, vRing) + halo;
        gl_FragColor = vec4(vC, a * vA);
      }`,
  });
  nodePoints = new THREE.Points(nodeGeo, nodeMat);
  nodePoints.frustumCulled = false;
  scene.add(nodePoints);

  // edges: fine threads, almost invisible until something comes near
  edgeGeo = new THREE.BufferGeometry();
  ePos = new Float32Array(edges.length * 6); eCol = new Float32Array(edges.length * 8);
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  edgeGeo.setAttribute('aCol', new THREE.BufferAttribute(eCol, 4));
  edgeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aCol; varying vec4 vCol; void main(){ vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec4 vCol; void main(){ gl_FragColor = vCol; }`,
  });
  edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
  edgeLines.frustumCulled = false;
  scene.add(edgeLines);
}

/* ---------- postprocessing: bloom, then grain, edge aberration and vignette after the sRGB conversion ---------- */
let composer, bloom, finish;
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uCA: { value: T.aberration.base }, uGrain: { value: T.grain } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uCA, uGrain; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    void main(){
      vec2 d = vUv - .5; float r2 = dot(d, d);
      vec2 off = d * r2 * uCA;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      c *= 1. - r2 * .85;
      c += (h(vUv * uRes + floor(uTime * 24.) * 17.) - .5) * uGrain;
      gl_FragColor = vec4(c, 1.);
    }`,
};
function setupComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(W, H), T.bloom.strength, T.bloom.radius, T.bloom.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  finish = new ShaderPass(FinishShader);
  composer.addPass(finish);
}

function resize() {
  W = innerWidth; H = innerHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  if (!renderer) return;
  renderer.setPixelRatio(PR);
  renderer.setSize(W, H, false);
  composer.setPixelRatio(PR);
  composer.setSize(W, H);
  bloom.resolution.set(W * (SMALL ? .5 : 1), H * (SMALL ? .5 : 1));
  finish.uniforms.uRes.value.set(W * PR, H * PR);
  const s = pxPerUnit();
  dustMat.uniforms.uScale.value = s; dustMat.uniforms.uPR.value = PR;
  if (nodeMat) { nodeMat.uniforms.uScale.value = s; nodeMat.uniforms.uPR.value = PR; }
  if (p < .02) layoutWordmark();
  hud.width = W * PR; hud.height = H * PR; hctx.setTransform(PR, 0, 0, PR, 0, 0);
  if (live && !selected && !tween) cam.distT = restDist();
}
const hud = $('hud');
const hctx = hud.getContext('2d');

/* ---------- per-frame: camera ---------- */
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function updateCamera(dt, now) {
  if (!live) {
    const e = E(clamp(p, 0, 1));
    cam.target.set(0, 0, 0).lerp(CENTER, e);
    cam.dist = cam.distT = 100 + (restDist() - 100) * e;
    cam.theta = Math.sin(e * Math.PI) * .18; // a slight sideways lean on the way in
    cam.phi = Math.sin(e * Math.PI) * -.08;
    cam.q.setFromAxisAngle(AY, cam.theta).multiply(qTmp.setFromAxisAngle(AX, -cam.phi));
  } else {
    if (tween) {
      tween.t = Math.min(1, tween.t + (tween.dur ? dt / tween.dur : 1));
      const e = E(tween.t);
      const to = tween.node ? tween.node.pos : CENTER;
      cam.target.copy(tween.from).lerp(to, e);
      cam.dist = cam.distT = tween.distFrom + (tween.distTo - tween.distFrom) * e;
      if (tween.t >= 1) tween = null;
    } else if (selected) {
      cam.target.lerp(selected.pos, 1 - Math.exp(-dt * 4));
    }
    if (!tween) cam.dist += (cam.distT - cam.dist) * (1 - Math.exp(-dt * 5));
    orbit(cam.vTheta, cam.vPhi);
    const damp = Math.exp(-dt * 4); cam.vTheta *= damp; cam.vPhi *= damp;
    if (!RM && !dragging) orbit(dt * (selected ? T.camDriftFocus : T.camDrift) * clamp((now - lastInteract) / 3000, 0, 1), 0);
  }
  camera.position.set(0, 0, cam.dist).applyQuaternion(cam.q).add(cam.target);
  camera.quaternion.copy(cam.q); // looks along its own -z, which points at the target
  // shift the view left while the panel covers the right side
  // (on phones the panel is a bottom sheet, so the view moves up instead)
  const wide = W >= 760;
  const wantX = selected && wide ? Math.min(210, W * .16) : 0, wantY = selected && !wide ? H * .27 : 0;
  const ok = RM ? 1 : 1 - Math.exp(-dt * 3);
  cam.offX += (wantX - cam.offX) * ok; cam.offY += (wantY - cam.offY) * ok;
  if (Math.abs(cam.offX) > .5 || Math.abs(cam.offY) > .5) camera.setViewOffset(W, H, cam.offX, cam.offY, W, H); else camera.clearViewOffset();
  nebula.position.copy(camera.position);
  dustMat.uniforms.uFocus.value = live ? camera.position.distanceTo(cam.target) : 100;
}

/* ---------- per-frame: nodes ---------- */
function fanSet() {
  const s = new Set(); let k = selected;
  while (k) { s.add(k.id); k = k.parentN; }
  return s;
}
function updateNodes(dt, t) {
  const ne = live ? 1 : E(clamp((p - .3) / .7, 0, 1));
  const fans = fanSet();
  const near = new Set();
  if (selected) { near.add(selected.id); adj[selected.id].forEach(e => near.add(e.to)); selected.children.forEach(c => near.add(c.id)); }
  const fk = RM ? 1 : 1 - Math.exp(-dt * 3);
  const hk = 1 - Math.exp(-dt * 8);
  for (const n of nodes) {
    // live position
    if (!n.parentN) {
      tmp.copy(n.base).add(CENTER);
      if (!RM && n.tier) tmp.add(tmp2.set(Math.sin(t * .07 + n.phase), Math.cos(t * .06 + n.phase * 1.3), Math.sin(t * .05 + n.phase * .7)).multiplyScalar(1.4));
    } else {
      const pn = n.parentN;
      const ang = RM ? 0 : t * n.orbit;
      tmp2.copy(n.restDir).applyAxisAngle(THREE.Object3D.DEFAULT_UP, ang);
      tmp2.lerp(n.fanDir, E(clamp(pn.fan, 0, 1)));
      tmp.copy(pn.pos).add(tmp2);
    }
    n.fan += ((fans.has(n.id) && n.children.length ? 1 : 0) - n.fan) * fk;
    if (live) n.pos.copy(tmp);
    else {
      // fly from a grain of the wordmark to its place, on a slight arc
      n.pos.copy(n.start).lerp(tmp, ne);
      n.pos.y += Math.sin(ne * Math.PI) * 10 * Math.sin(n.phase);
    }
    nPos[n.i * 3] = n.pos.x; nPos[n.i * 3 + 1] = n.pos.y; nPos[n.i * 3 + 2] = n.pos.z;

    const isHot = n === hovered || n === selected;
    n.hot += ((isHot ? 1 : 0) - n.hot) * hk;
    n.dim += ((selected && !near.has(n.id) ? 1 : 0) - n.dim) * hk;
    const collapsed = n.parentN ? 1 - clamp(n.parentN.fan, 0, 1) : 0;
    const baseSize = [2.6, 1.7, 1.15, .8][n.tier];
    const size = baseSize * (1 - collapsed * .45) * (1 + n.hot * .7);
    nSize[n.i] = (.3 + (size - .3) * ne) * (1 + audio.bass * .3);
    let a = (n.tier === 3 ? .85 : n.tier === 2 ? .8 : 1) * (1 - collapsed * .55) * (1 - n.dim * .72);
    nAlpha[n.i] = (.6 + .4 * ne) * a;
    const c = colorFor(n);
    nColor[n.i * 3] = c.r; nColor[n.i * 3 + 1] = c.g; nColor[n.i * 3 + 2] = c.b;
  }
  nodeGeo.attributes.position.needsUpdate = true; nodeGeo.attributes.aSize.needsUpdate = true;
  nodeGeo.attributes.aColor.needsUpdate = true; nodeGeo.attributes.aAlpha.needsUpdate = true;
}
const NODE = col(T.node), HOT = col(T.nodeHot), EFROM = col(T.edgeFrom), ETO = col(T.edgeTo), cTmp = new THREE.Color();
function colorFor(n) { return cTmp.copy(NODE).lerp(HOT, n.hot * .75); }

/* ---------- per-frame: project to screen for hover, threads and labels ---------- */
function project() {
  for (const n of nodes) {
    tmp.copy(n.pos).project(camera);
    const ok = tmp.z < 1 && tmp.z > -1;
    n.scr.x = (tmp.x + 1) / 2 * W; n.scr.y = (1 - tmp.y) / 2 * H; n.scr.ok = ok;
    n.scr.depth = camera.position.distanceTo(n.pos);
  }
}
const hoverable = n => n.scr.ok && (!n.parentN || n.parentN.fan > .5);
function pick(x, y, radius) {
  let best = null, bd = radius;
  for (const n of nodes) {
    if (!hoverable(n)) continue;
    const d = Math.hypot(n.scr.x - x, n.scr.y - y) - (n.tier === 0 ? 6 : 0);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

/* ---------- per-frame: edges ---------- */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function updateEdges(dt) {
  const show = live ? 1 : clamp((p - .82) / .18, 0, 1);
  const base = (FINE ? .022 : .05) + audio.beat * .12;
  const k = 1 - Math.exp(-dt * 6);
  const usePointer = FINE && pointer.inside && live;
  edges.forEach((e, i) => {
    ePos.set([e.a.pos.x, e.a.pos.y, e.a.pos.z, e.b.pos.x, e.b.pos.y, e.b.pos.z], i * 6);
    let a = base;
    if (usePointer && e.a.scr.ok && e.b.scr.ok) {
      const d = segDist(pointer.sx, pointer.sy, e.a.scr.x, e.a.scr.y, e.b.scr.x, e.b.scr.y);
      if (d < 170) a += .3 * Math.pow(1 - d / 170, 2);
    }
    // threads you are flying close to light up on their own
    tmp.copy(e.a.pos).add(e.b.pos).multiplyScalar(.5);
    const dc = camera.position.distanceTo(tmp);
    if (dc < 70) a += .22 * (1 - dc / 70);
    if (selected) a = (e.a === selected || e.b === selected) ? .7 : a * .25;
    if (hovered && (e.a === hovered || e.b === hovered)) a = Math.max(a, .5);
    const vis = Math.min(e.a.parentN ? .35 + .65 * clamp(e.a.parentN.fan, 0, 1) : 1, e.b.parentN ? .35 + .65 * clamp(e.b.parentN.fan, 0, 1) : 1);
    e.lit += (a * vis * show - e.lit) * k;
    eCol.set([EFROM.r, EFROM.g, EFROM.b, e.lit, ETO.r, ETO.g, ETO.b, e.lit], i * 8);
  });
  edgeGeo.attributes.position.needsUpdate = true; edgeGeo.attributes.aCol.needsUpdate = true;
}

/* ---------- HUD: the pointer dot, its thread, names ---------- */
function label(n, alpha, big) {
  if (!n.scr.ok) return;
  hctx.font = `${big ? 11 : 10}px "${T.fonts.mono}", ui-monospace, monospace`;
  hctx.fillStyle = rgba(T.fg, alpha);
  const r = Math.max(5, Math.min(22, ([2.6, 1.7, 1.15, .8][n.tier] * pxPerUnit() / n.scr.depth) * .3));
  hctx.fillText(n.d.label.toUpperCase(), n.scr.x + r + 8, n.scr.y);
}
function drawHud() {
  hctx.clearRect(0, 0, W, H);
  if (!live) return;
  hctx.textBaseline = 'middle';
  if ('letterSpacing' in hctx) hctx.letterSpacing = '1px';
  const showDot = FINE && pointer.inside;
  if (showDot) {
    // the pointer is a point in the net: faint threads to what is close, a clear one to what it touches
    const close = nodes.filter(n => hoverable(n) && n !== hovered).map(n => [n, Math.hypot(n.scr.x - pointer.sx, n.scr.y - pointer.sy)]).filter(([, d]) => d < 150).sort((a, b) => a[1] - b[1]).slice(0, 3);
    hctx.lineWidth = 1;
    for (const [n, d] of close) {
      hctx.strokeStyle = rgba(T.edgeFrom, .16 * (1 - d / 150));
      hctx.beginPath(); hctx.moveTo(pointer.sx, pointer.sy); hctx.lineTo(n.scr.x, n.scr.y); hctx.stroke();
    }
    if (hovered && hovered.scr.ok) {
      const g = hctx.createLinearGradient(pointer.sx, pointer.sy, hovered.scr.x, hovered.scr.y);
      g.addColorStop(0, rgba(T.edgeFrom, .85)); g.addColorStop(1, rgba(T.edgeTo, .85));
      hctx.strokeStyle = g;
      hctx.beginPath(); hctx.moveTo(pointer.sx, pointer.sy); hctx.lineTo(hovered.scr.x, hovered.scr.y); hctx.stroke();
    }
    const glow = hctx.createRadialGradient(pointer.sx, pointer.sy, 0, pointer.sx, pointer.sy, 16);
    glow.addColorStop(0, rgba(T.pointer, .55)); glow.addColorStop(.25, rgba(T.pointerGlow, .18)); glow.addColorStop(1, rgba(T.pointerGlow, 0));
    hctx.fillStyle = glow; hctx.beginPath(); hctx.arc(pointer.sx, pointer.sy, 16, 0, 7); hctx.fill();
    hctx.fillStyle = T.pointer; hctx.beginPath(); hctx.arc(pointer.sx, pointer.sy, 2.4, 0, 7); hctx.fill();
  }
  if (selected) {
    const seen = new Set([selected.id]);
    for (const e of adj[selected.id]) { const n = N[e.to]; if (n && !seen.has(n.id)) { seen.add(n.id); label(n, .62, false); } }
    for (const c of selected.children) if (!seen.has(c.id)) { seen.add(c.id); label(c, .62, false); }
  }
  if (hovered && hovered !== selected) label(hovered, .95, true);
}

/* ---------- loop ---------- */
let last = performance.now(), slow = 0, frames = 0, degraded = false;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  // intro progress: scroll drives it directly, otherwise it starts on its own
  if (!live) {
    if (!auto && now - lastInput > AUTO_AFTER) auto = true;
    if (auto) pTarget = Math.min(1, pTarget + dt / AUTO_DURATION);
    p += (pTarget - p) * (1 - Math.exp(-dt * 2.4));
    if (pTarget >= 1 && p > .993) goLive();
  }
  dustMat.uniforms.uP.value = p;
  dustMat.uniforms.uTime.value = RM ? 0 : t;
  nebulaMat.uniforms.uTime.value = RM ? 0 : t;
  finish.uniforms.uTime.value = RM ? 0 : t;
  updateAudio(dt);
  const amt = RM ? .3 : 1;
  dustMat.uniforms.uAudio.value.set(audio.bass * amt, audio.mid * amt, audio.high * amt);
  bloom.strength = T.bloom.strength + audio.bass * T.bloom.audio * amt;
  finish.uniforms.uCA.value = T.aberration.base + audio.beat * T.aberration.beat * amt;

  // inertia on the pointer dot
  const pk = 1 - Math.exp(-dt * 14);
  pointer.sx += (pointer.x - pointer.sx) * pk; pointer.sy += (pointer.y - pointer.sy) * pk;

  updateCamera(dt, now);
  if (nodes.length) {
    updateNodes(dt, t);
    camera.updateMatrixWorld();
    project();
    hovered = live && FINE && pointer.inside && !dragging ? pick(pointer.sx, pointer.sy, 40) : null;
    updateEdges(dt);
  }
  composer.render(dt);
  drawHud();

  // keep 60 fps: one step down in resolution if the first seconds run slow
  if (!degraded) { frames++; if (dt > .022) slow++; if (frames === 150) { if (slow > 60 && PR > 1) { PR = 1; degraded = true; resize(); } frames = slow = 0; } }
  requestAnimationFrame(frame);
}

function goLive() {
  if (live) return;
  p = pTarget = 1; live = true; auto = false;
  body.classList.add('live');
  cam.distT = cam.dist = restDist();
  lastInteract = performance.now();
}

/* ---------- input ---------- */
let dragging = false, down = null;
const pointers = new Map();
let pinch0 = 0, pinchDist0 = 0;

function nudge(delta) { // intro only: scroll moves the dissolve, both ways
  lastInput = performance.now(); auto = false;
  pTarget = clamp(pTarget + delta, 0, 1);
}
addEventListener('wheel', e => {
  if (!$('index').hidden || e.target.closest('#panel')) return;
  e.preventDefault();
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  if (!live) { nudge(dy * .0011); return; }
  lastInteract = performance.now();
  cam.distT = clamp(cam.distT * Math.exp(dy * .0012), 16, 420);
}, { passive: false });

let touchY = null;
addEventListener('touchstart', e => { if (!live && e.touches.length === 1) touchY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => {
  if (!live && touchY !== null && e.touches.length === 1) { const y = e.touches[0].clientY; nudge((touchY - y) * .0035); touchY = y; }
}, { passive: true });
addEventListener('touchend', () => (touchY = null), { passive: true });

canvas.addEventListener('pointerdown', e => {
  pointer.type = e.pointerType;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.setPointerCapture(e.pointerId);
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); pinchDist0 = cam.distT; down = null; return; }
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY };
  dragging = false;
});
canvas.addEventListener('pointermove', e => {
  pointer.type = e.pointerType;
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (!pointer.inside) { pointer.inside = true; pointer.sx = e.clientX; pointer.sy = e.clientY; }
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!live) return;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0 > 0) cam.distT = clamp(pinchDist0 * pinch0 / d, 16, 420);
    lastInteract = performance.now();
    return;
  }
  if (!down) return;
  if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) dragging = true;
  if (dragging) {
    cam.vTheta = -(e.clientX - down.lx) * .0045; cam.vPhi = (e.clientY - down.ly) * .0035;
    down.lx = e.clientX; down.ly = e.clientY;
    lastInteract = performance.now();
  }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size) return;
  const wasDrag = dragging; dragging = false;
  if (!down) return;
  down = null;
  if (wasDrag) return;
  if (!live) { lastInput = 0; auto = true; return; } // a click during the arrival lets it go
  const hit = e.pointerType === 'mouse' ? pick(e.clientX, e.clientY, 40) : pick(e.clientX, e.clientY, 34);
  if (hit) select(hit); else if (selected) select(null);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); down = null; dragging = false; });
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pointer.inside = false; });
canvas.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { pointer.inside = true; pointer.x = pointer.sx = e.clientX; pointer.y = pointer.sy = e.clientY; } });

addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const idxOpen = !$('index').hidden;
  if (e.key === 'Escape') { if (idxOpen) showIndex(false); else if (selected) select(null); return; }
  if (e.key.toLowerCase() === 'i' && !e.target.closest('input,textarea')) { showIndex(!idxOpen); return; }
  if (!live && !idxOpen && ['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key) && e.target === document.body) { e.preventDefault(); nudge(.25); auto = true; }
  if (!live && !idxOpen && ['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); nudge(-.25); }
});

/* ---------- focus and panel ---------- */
const panel = $('panel');
function select(n, opts = {}) {
  const prevFocusInPanel = panel.contains(document.activeElement);
  selected = n;
  if (!n) {
    panel.classList.remove('open'); panel.inert = true;
    tween = { from: cam.target.clone(), node: null, t: 0, dur: FOCUS_DURATION, distFrom: cam.dist, distTo: restDist() };
    history.replaceState(null, '', location.pathname);
    return;
  }
  if (!live) goLive();
  $('pKind').textContent = n.d.kind || '';
  $('pTitle').textContent = n.d.label;
  const meta = $('pMeta'); meta.replaceChildren();
  Object.entries(n.d.meta || {}).forEach(([k, v]) => {
    const a = document.createElement('span'); a.textContent = k;
    const b = document.createElement('span');
    if (/^[^@\s]+@[^@\s]+$/.test(v)) { b.className = 'mail'; const l = document.createElement('a'); l.href = 'mailto:' + v; l.textContent = v; l.style.color = 'inherit'; b.append(l); } else b.textContent = v;
    meta.append(a, b);
  });
  $('pNote').textContent = n.d.note || '';
  const ed = $('pEdges'); ed.replaceChildren();
  [...adj[n.id]].sort((a, b) => a.v.localeCompare(b.v, 'de') || N[a.to].d.label.localeCompare(N[b.to].d.label, 'de')).forEach(e => {
    const b = document.createElement('button'); b.type = 'button';
    const s = document.createElement('span'); s.textContent = N[e.to].d.label;
    const em = document.createElement('em'); em.textContent = e.v;
    b.append(s, em);
    b.addEventListener('click', ev => select(N[e.to], { keyboard: ev.detail === 0 }));
    ed.append(b);
  });
  const links = $('pLinks'); links.replaceChildren();
  (n.d.links || []).forEach(([t, u]) => { const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t + ' ↗'; links.append(a); });
  panel.inert = false; panel.classList.add('open'); panel.scrollTop = 0;
  if (prevFocusInPanel || opts.keyboard) $('close').focus({ preventScroll: true });
  const distTo = (n.tier === 0 ? 105 : n.children.length ? 72 : 48) * (W / H < 1 ? 1.45 : 1);
  tween = { from: cam.target.clone(), node: n, t: 0, dur: FOCUS_DURATION, distFrom: cam.dist, distTo };
  history.replaceState(null, '', '#' + n.id);
}
$('close').addEventListener('click', () => select(null));

/* ---------- index ---------- */
const idx = $('index');
function buildIndex() {
  const list = $('indexList'); list.replaceChildren();
  [...NODES].sort((a, b) => a.label.localeCompare(b.label, 'en')).forEach(d => {
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = d.id; b.textContent = d.label;
    const s = document.createElement('small'); s.textContent = d.kind;
    li.append(b, s); list.append(li);
  });
}
$('indexList').addEventListener('click', e => {
  const b = e.target.closest('button[data-id]'); if (!b || !N[b.dataset.id]) return;
  showIndex(false, false);
  select(N[b.dataset.id], { keyboard: e.detail === 0 });
});
function showIndex(on, restoreFocus = true) {
  idx.hidden = !on;
  if (on) idx.querySelector('#indexList button')?.focus({ preventScroll: true });
  else if (restoreFocus) $('toIndex').focus({ preventScroll: true });
}
$('toIndex').addEventListener('click', () => showIndex(true));
$('toGraph').addEventListener('click', () => showIndex(false));

/* ---------- sound: an own file through Web Audio, so the universe can listen to it ---------- */
// Streaming embeds (Spotify, SoundCloud) hide their signal from the page; only a file can drive the visuals.
const audio = { buf: null, src: null, ctx: null, an: null, gain: null, bins: null, bass: 0, mid: 0, high: 0, beat: 0, avg: 0, playing: false, loading: false, loop: [0, 0], startedAt: 0, offset: 0 };
function band(a, b) { let s = 0; for (let i = a; i < b; i++) s += audio.bins[i]; return s / ((b - a) * 255); }
function updateAudio(dt) {
  if (!audio.an) return;
  const k = 1 - Math.exp(-dt * 12), slow = 1 - Math.exp(-dt * 1.5);
  let b = 0, m = 0, h = 0;
  if (audio.playing) { audio.an.getByteFrequencyData(audio.bins); b = band(1, 6); m = band(6, 40); h = band(40, 140); }
  // contrast: what stands out above the running level, not the level itself
  audio.avg += (b - audio.avg) * slow;
  const onset = clamp((b - audio.avg) * 5, 0, 1);
  audio.bass += (clamp((b - audio.avg) * 4 + .12, 0, 1) - audio.bass) * k; // relative, so a steady bassline still pulses
  audio.mid += (m - audio.mid) * k;
  audio.high += (clamp(h * 2, 0, 1) - audio.high) * k;
  audio.beat = Math.max(onset, audio.beat * Math.exp(-dt * 5));
}
async function setupAudio() {
  const player = $('player');
  const ok = await fetch(TRACK.src, { method: 'HEAD' }).then(r => r.ok && !(r.headers.get('content-type') || '').includes('text/html')).catch(() => false);
  if (!ok) return;
  const n = N[TRACK.node];
  if (n) {
    const artists = edges.filter(e => e.a === n && e.r === 'by').map(e => e.b.d.label);
    $('trackTitle').textContent = n.d.label;
    $('trackBy').textContent = artists.join(', ');
    const pref = ['Spotify', 'Apple Music', 'Beatport', 'SoundCloud'];
    const link = [...(n.d.links || [])].sort((a, b) => (pref.indexOf(a[0]) + 99) % 99 - (pref.indexOf(b[0]) + 99) % 99)[0];
    if (link) { const a = $('stream'); a.href = link[1]; a.textContent = `Stream on ${link[0]} ↗`; a.hidden = false; }
  }
  player.hidden = false;
  $('play').addEventListener('click', togglePlay);
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey && live) togglePlay(); });
}
// The file is the intro of the track (16 bars at 123 BPM) plus a short safety tail. An <audio loop> would leave a gap
// at the seam (MP3 padding), so the buffer is looped sample-exactly: from the first transient, 16 bars long.
async function loadAudio() {
  if (audio.buf || audio.loading) return;
  audio.loading = true;
  audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  audio.an = audio.ctx.createAnalyser(); audio.an.fftSize = 512; audio.an.smoothingTimeConstant = .6;
  audio.bins = new Uint8Array(audio.an.frequencyBinCount);
  audio.gain = audio.ctx.createGain(); audio.gain.gain.value = 0;
  audio.an.connect(audio.gain); audio.gain.connect(audio.ctx.destination);
  const data = await fetch(TRACK.src).then(r => r.arrayBuffer());
  audio.buf = await audio.ctx.decodeAudioData(data);
  const ch = audio.buf.getChannelData(0);
  let i = 0; while (i < ch.length && Math.abs(ch[i]) < .1) i++; // the track opens on a hit: that is bar one
  const start = i / audio.buf.sampleRate;
  audio.loop = [start, Math.min(start + TRACK.bars * 4 * 60 / TRACK.bpm, audio.buf.duration)];
  audio.loading = false;
}
function startSource(offset) {
  const s = audio.ctx.createBufferSource();
  s.buffer = audio.buf; s.loop = true; s.loopStart = audio.loop[0]; s.loopEnd = audio.loop[1];
  s.connect(audio.an);
  s.start(0, audio.loop[0] + offset);
  audio.src = s; audio.startedAt = audio.ctx.currentTime; audio.offset = offset;
}
async function togglePlay() {
  if (!audio.buf) { await loadAudio(); if (!audio.buf) return; }
  const t = audio.ctx.currentTime, g = audio.gain.gain, len = audio.loop[1] - audio.loop[0];
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  if (!audio.playing) {
    audio.ctx.resume();
    startSource(audio.offset % len);
    g.linearRampToValueAtTime(1, t + 1.6);
    audio.playing = true;
  } else {
    g.linearRampToValueAtTime(0, t + .8);
    const s = audio.src;
    audio.offset = (audio.offset + t - audio.startedAt) % len;
    setTimeout(() => { if (!audio.playing && s) { try { s.stop(); } catch {} } }, 850);
    audio.playing = false;
  }
  $('play').setAttribute('aria-pressed', String(audio.playing));
  $('play').querySelector('span').textContent = audio.playing ? 'Pause' : 'Play';
  body.classList.toggle('sound', audio.playing);
}

/* ---------- start ---------- */
async function start() {
  if (!renderer) { body.classList.add('live'); idx.hidden = false; $('toGraph').hidden = true; return; }
  if (FINE) body.classList.add('dot');
  setupComposer();
  await fontP;
  resize();
  addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  const [nodesData, edgeData] = await dataP;
  buildGraph(nodesData, edgeData);
  nodeMat.uniforms.uScale.value = pxPerUnit(); nodeMat.uniforms.uPR.value = PR;
  buildIndex();
  setupAudio();
  if (RM) goLive();
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && N[id]) { goLive(); select(N[id]); }
}
start();
if (import.meta.env.DEV) window.__cd = { get nodes() { return nodes; }, cam, camera, get p() { return p; }, renderer, audio, select: id => select(N[id]) };
