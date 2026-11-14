// Generates hooks/scene.ts for the forest-mist mod: a dusk pine forest with drifting mist and fireflies.
//
// The desktop app plays a scene only when its SVG passes a strict check, so this scene keeps to it:
// one palette (no @media, no prefers-color-scheme), colors as plain attributes (no <style>),
// SMIL for motion, only basic shapes and gradients, no comments.
import { writeFileSync } from 'node:fs'

const OUT = process.argv[2]
const W = 1600
const H = 1000

let seed = 11
const rnd = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

// Dusk: grey-green sky with a warm afterglow low on the horizon.
const C = {
  sky: [['0', '#2f3d38'], ['0.5', '#58685d'], ['0.8', '#9c8e6c'], ['1', '#c2a679']],
  sun: '#ffd49a',
  ridge: '#4b5a4e',
  far: '#3b493f',
  mid: [['0', '#26332b'], ['1', '#5b685b']],
  near: [['0', '#121b15'], ['0.55', '#1c2820'], ['1', '#525f53']],
  fog: '#cfd2bd',
  fly: '#eef7a6',
  flyCore: '#f8fcd2',
}

const EASE = '0.45 0 0.55 1'

// A fir silhouette: many uneven tiers of drooping branches, a thin spire and a short trunk.
// `detail` adds a needle jag under each branch, worth it only on the big near trees.
function pine(x, y, h, { detail = false, prec = 0 } = {}) {
  const f = prec === 0 ? n => Math.round(n) : n => Math.round(n * 10) / 10
  const trunkH = h * 0.06
  const trunkW = Math.max(2, h * 0.022)
  const base = y - trunkH
  const crownH = h - trunkH
  const maxW = h * (0.2 + rnd() * 0.07)
  const tiers = Math.max(5, Math.min(24, Math.round(h / (detail ? 20 : 16))))
  const step = crownH / tiers
  const side = s => {
    const pts = []
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers
      const yb = base - crownH * t
      const w = maxW * Math.pow(1 - t, 1.05) * (0.7 + rnd() * 0.55) + h * 0.012
      const droop = step * (0.2 + rnd() * 0.35)
      const tipY = yb + droop
      if (detail) {
        pts.push([x + s * w * (0.55 + rnd() * 0.15), tipY - droop * 0.7 + (rnd() - 0.3) * step * 0.25])
      }
      pts.push([x + s * w, tipY])
      pts.push([x + s * (trunkW * 0.6 + w * (0.18 + rnd() * 0.22)), yb - step * (0.45 + rnd() * 0.35)])
    }
    return pts
  }
  const left = side(-1)
  const right = side(1).reverse()
  const top = [x + (rnd() - 0.5) * h * 0.01, base - crownH - h * 0.025]
  const pts = [[x - trunkW / 2, y], [x - trunkW / 2, base], ...left, top, ...right, [x + trunkW / 2, base], [x + trunkW / 2, y]]
  return 'M' + pts.map(([a, b]) => `${f(a)} ${f(b)}`).join('L') + 'z'
}

// Taller toward the edges so the middle, where the words sit, stays open.
const edge = x => 0.5 + 1.0 * Math.pow(Math.abs(x - W / 2) / (W / 2), 1.5)

function row({ y, minH, maxH, gap, jitter, from = -60, to = W + 60, keep = () => true, opts = {} }) {
  let d = ''
  for (let x = from; x <= to; x += gap * (0.55 + rnd() * 0.9)) {
    if (!keep(x)) continue
    const h = (minH + rnd() * (maxH - minH)) * edge(x)
    d += pine(x, y + rnd() * jitter, h, opts)
  }
  return d
}

function hills(baseY, amp, waves, phase) {
  let d = `M-100 ${H}L-100 ${baseY}`
  for (let x = -100; x <= W + 100; x += 40) {
    const y = baseY - amp * (0.5 + 0.5 * Math.sin((x / W) * Math.PI * waves + phase)) * edge(x)
    d += `L${x} ${Math.round(y)}`
  }
  return d + `L${W + 100} ${H}z`
}

const ridge = hills(690, 110, 2.3, 0.6)
const far = row({ y: 730, minH: 45, maxH: 85, gap: 22, jitter: 20 })
const mid = row({ y: 860, minH: 100, maxH: 175, gap: 34, jitter: 30 })
const near = row({
  y: 1070, minH: 430, maxH: 620, gap: 95, jitter: 25,
  from: -80, keep: x => x < 360 || x > 1240, opts: { detail: true, prec: 1 },
})

// Fireflies, in front of the trees, on the flanks and low. Each has a resting opacity,
// so a surface that plays no animation still shows it.
let flies = ''
for (let i = 0; i < 20; i++) {
  const left = i % 2 === 0
  const x = left ? 30 + rnd() * 520 : W - 30 - rnd() * 520
  const y = 560 + rnd() * 390
  const blink = (3 + rnd() * 4).toFixed(1)
  const drift = (14 + rnd() * 14).toFixed(1)
  const delay = (-rnd() * 10).toFixed(1)
  const rest = (0.45 + ((i * 37) % 11) / 20).toFixed(2)
  const cx = Math.round(x)
  const cy = Math.round(y)
  flies +=
    `<g opacity="${rest}">` +
    `<animate attributeName="opacity" values="0.1;1;1;0.1" keyTimes="0;.35;.65;1" dur="${blink}s" begin="${delay}s" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;20 -30;0 0" keyTimes="0;.5;1" calcMode="spline" keySplines="${EASE};${EASE}" dur="${drift}s" begin="${delay}s" repeatCount="indefinite"/>` +
    `<circle cx="${cx}" cy="${cy}" r="16" fill="url(#flyGlow)"/><circle cx="${cx}" cy="${cy}" r="2.3" fill="${C.flyCore}"/></g>`
}

// SMIL timing per mist band: drift period, drift start, breathe period, breathe start, reversed.
const BANDS = {
  1: { drift: 64, dBegin: 0, breathe: 15, bBegin: 0, rev: false },
  2: { drift: 46, dBegin: -20, breathe: 11, bBegin: -4, rev: false },
  3: { drift: 34, dBegin: -9, breathe: 13, bBegin: -7, rev: false },
  4: { drift: 27, dBegin: 0, breathe: 9, bBegin: -2, rev: true },
}

// A mist band: wide soft ellipses, over twice the screen width so it can drift far.
// The outer group breathes (opacity), the inner one drifts (transform).
function mist(n, y, ry, count) {
  const b = BANDS[n]
  const path = b.rev ? '260 0;-260 0;260 0' : '-260 0;260 0;-260 0'
  let g =
    `<g opacity="1"><animate attributeName="opacity" values=".45;1;.45" keyTimes="0;.5;1" calcMode="spline" keySplines="${EASE};${EASE}" dur="${b.breathe * 2}s" begin="${b.bBegin}s" repeatCount="indefinite"/>` +
    `<g><animateTransform attributeName="transform" type="translate" values="${path}" keyTimes="0;.5;1" calcMode="spline" keySplines="${EASE};${EASE}" dur="${b.drift * 2}s" begin="${b.dBegin}s" repeatCount="indefinite"/>`
  for (let i = 0; i < count; i++) {
    const cx = -W * 0.6 + (i + rnd() * 0.6) * ((W * 2.4) / count)
    const rx = 280 + rnd() * 260
    const yy = y + (rnd() - 0.5) * ry
    g += `<ellipse cx="${Math.round(cx)}" cy="${Math.round(yy)}" rx="${Math.round(rx)}" ry="${Math.round(ry * (0.6 + rnd() * 0.5))}" fill="url(#fog)"/>`
  }
  return g + '</g></g>'
}

const stops = list => list.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops(C.sky)}</linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${C.sun}" stop-opacity="0.6"/><stop offset="1" stop-color="${C.sun}" stop-opacity="0"/></radialGradient>
<radialGradient id="fog"><stop offset="0" stop-color="${C.fog}" stop-opacity="0.6"/><stop offset="0.6" stop-color="${C.fog}" stop-opacity="0.32"/><stop offset="1" stop-color="${C.fog}" stop-opacity="0"/></radialGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.fog}" stop-opacity="0"/><stop offset="1" stop-color="${C.fog}" stop-opacity="0.55"/></linearGradient>
<linearGradient id="midG" gradientUnits="userSpaceOnUse" x1="0" y1="660" x2="0" y2="900">${stops(C.mid)}</linearGradient>
<linearGradient id="nearG" gradientUnits="userSpaceOnUse" x1="0" y1="380" x2="0" y2="1000">${stops(C.near)}</linearGradient>
<radialGradient id="flyGlow"><stop offset="0" stop-color="${C.fly}" stop-opacity="0.6"/><stop offset="1" stop-color="${C.fly}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<ellipse cx="1240" cy="660" rx="520" ry="300" fill="url(#glow)"/>
<path fill="${C.ridge}" d="${ridge}"/>
${mist(1, 680, 80, 8)}
<path fill="${C.far}" d="${far}"/>
${mist(2, 790, 90, 8)}
<path fill="url(#midG)" d="${mid}"/>
${mist(3, 900, 80, 9)}
<path fill="url(#nearG)" d="${near}"/>
<rect y="860" width="${W}" height="140" fill="url(#ground)"/>
${flies}
${mist(4, 975, 60, 9)}
</svg>`

const ts = `// Generated: a dusk pine forest with drifting mist and fireflies, animated with SMIL.
export const SCENE = ${JSON.stringify(svg.replace(/\n/g, ''))}
`
writeFileSync(OUT, ts)
console.log('svg chars:', svg.length)
