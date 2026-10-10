// Every design constant of the universe lives here. A colour world (design/<name>) changes only this file.
// Colours are sRGB hex; main.js converts them for WebGL and writes the CSS custom properties from them.

// Chrome: graphite and silver, an almost colourless nebula with a cold cast, pure-white points, one signal orange.
export default {
  name: 'chrome',

  // page and panel
  bg: '#0a0b0d',          // ground, panel, index ink
  fg: '#eef1f4',          // text, index paper
  dim: .6,                // opacity of secondary text (fg at this alpha)
  line: .14,              // opacity of hairlines (fg at this alpha)
  accent: '#ff6a24',      // kind label, hover, thread start
  accent2: '#cfd8e0',     // thread end, playing dot
  indexHover: '#b23a00',  // hover in the light index
  indexDim: .66,          // opacity of the kinds in the light index (bg at this alpha)

  // background shader: base plus two wisps of colour, each with its strength
  nebula: { base: '#0a0b0d', a: '#a9bccd', aAmount: .055, b: '#dfe8f0', bAmount: .015 },

  // points
  dust: '#ffffff',        // stardust and the wordmark
  dustTintA: '#b9c6d2',   // share of the dust that turns accent after the dissolve
  dustTintAShare: .08,
  dustTintB: '#ff6a24',
  dustTintBShare: .006,
  node: '#ffffff',
  nodeHot: '#ff6a24',     // hovered or selected node, mixed in at 75 %
  edgeFrom: '#dfe6ec',
  edgeTo: '#8b98a5',
  pointer: '#ffffff',     // the dot that replaces the cursor
  pointerGlow: '#a9bccd',

  // postprocessing
  bloom: { strength: .42, radius: .16, threshold: .16, audio: .5 }, // audio: extra strength on the bass
  grain: .03,
  aberration: { base: .004, beat: .01 },

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
