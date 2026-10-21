// Every design constant of the universe lives here. A colour world (design/<name>) changes only this file.
// Colours are sRGB hex; main.js converts them for WebGL and writes the CSS custom properties from them.

export default {
  name: 'ultraviolet',

  // page and panel
  bg: '#07060c',          // ground, panel, index ink
  fg: '#f2eee6',          // text, index paper
  dim: .42,               // opacity of secondary text (fg at this alpha)
  line: .14,              // opacity of hairlines (fg at this alpha)
  accent: '#c9a9ff',      // kind label, hover, thread start
  accent2: '#5de0c8',     // thread end, playing dot
  indexHover: '#6a3fd6',  // hover in the light index
  indexDim: .55,          // opacity of the kinds in the light index (bg at this alpha)

  // background shader: base plus two wisps of colour, each with its strength
  nebula: { base: '#07060c', a: '#c9a9ff', aAmount: .07, b: '#5de0c8', bAmount: .03 },

  // points
  dust: '#f2eee6',        // stardust and the wordmark
  dustTintA: '#c9a9ff',   // share of the dust that turns accent after the dissolve
  dustTintAShare: .06,
  dustTintB: '#5de0c8',
  dustTintBShare: .04,
  node: '#f2eee6',
  nodeHot: '#c9a9ff',     // hovered or selected node, mixed in at 75 %
  edgeFrom: '#c9a9ff',
  edgeTo: '#5de0c8',
  pointer: '#f2eee6',     // the dot that replaces the cursor
  pointerGlow: '#c9a9ff',

  // postprocessing
  bloom: { strength: .5, radius: .18, threshold: .14, audio: .55 }, // audio: extra strength on the bass
  grain: .035,
  aberration: { base: .006, beat: .012 },

  // motion
  camDrift: .016,         // rad/s while nobody touches anything
  camDriftFocus: .006,    // rad/s while a node is in focus
  breath: { depth: .55, scale: .42 }, // wordmark: speed of the depth wobble and of the overall swell

  // type
  fonts: {
    display: 'Unbounded',
    mono: 'Space Mono',
  },
};
