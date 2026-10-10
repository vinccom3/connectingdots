// Every design constant of the universe lives here. A colour world (design/<name>) changes only this file.
// Colours are sRGB hex; main.js converts them for WebGL and writes the CSS custom properties from them.

// Ember: almost black, rust and bordeaux in the nebula, amber points, one cold pale-blue accent.
export default {
  name: 'ember',

  // page and panel
  bg: '#0a0605',          // ground, panel, index ink
  fg: '#f5e8d8',          // text, index paper
  dim: .6,                // opacity of secondary text (fg at this alpha)
  line: .14,              // opacity of hairlines (fg at this alpha)
  accent: '#b7d4ef',      // kind label, hover, thread start
  accent2: '#f0a65e',     // thread end, playing dot
  indexHover: '#9a2e17',  // hover in the light index
  indexDim: .66,          // opacity of the kinds in the light index (bg at this alpha)

  // background shader: base plus two wisps of colour, each with its strength
  nebula: { base: '#0a0605', a: '#b5421f', aAmount: .11, b: '#7a1426', bAmount: .09 },

  // points
  dust: '#ffcf96',        // stardust and the wordmark
  dustTintA: '#e0683a',   // share of the dust that turns accent after the dissolve
  dustTintAShare: .06,
  dustTintB: '#b7d4ef',
  dustTintBShare: .015,
  node: '#ffdcb0',
  nodeHot: '#b7d4ef',     // hovered or selected node, mixed in at 75 %
  edgeFrom: '#e0683a',
  edgeTo: '#f0a65e',
  pointer: '#ffe6c8',     // the dot that replaces the cursor
  pointerGlow: '#e0683a',

  // postprocessing
  bloom: { strength: .55, radius: .22, threshold: .14, audio: .6 }, // audio: extra strength on the bass
  grain: .04,
  aberration: { base: .006, beat: .012 },

  // motion
  camDrift: .016,         // rad/s while nobody touches anything
  camDriftFocus: .006,    // rad/s while a node is in focus
  breath: { depth: .55, scale: .42 }, // wordmark: speed of the depth wobble and of the overall swell

  // type
  fonts: {
    display: 'Unbounded',
    mono: 'Space Mono',
    href: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@300;500;800&family=Space+Mono:wght@400;700&display=swap',
  },
};
