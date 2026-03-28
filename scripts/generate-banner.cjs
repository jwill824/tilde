#!/usr/bin/env node
/**
 * Generates docs/banner.svg — animated tilde wave banner for README.
 * GitHub renders SMIL-animated SVGs in README <img> tags.
 * Run: node scripts/generate-banner.js
 */
const fs = require('fs');
const path = require('path');

const W = 560, H = 180, N = 15, PERIOD = 1.6;
const Y_MID = 48, Y_AMP = 22;

// 15 animated ~ characters spread evenly across the width
const waveChars = Array.from({ length: N }, (_, i) => {
  const x = Math.round(20 + i * ((W - 40) / (N - 1)));
  const begin = ((i * PERIOD) / N).toFixed(2);
  const yHi = Y_MID - Y_AMP;
  const yLo = Y_MID + Y_AMP;
  return [
    `  <text x="${x}" y="${Y_MID}"`,
    `    font-family="'Courier New',Courier,monospace"`,
    `    font-size="26" font-weight="bold" fill="#22d3ee">~`,
    `    <animate attributeName="y" values="${yHi};${yLo};${yHi}"`,
    `      dur="${PERIOD}s" begin="${begin}s" repeatCount="indefinite"`,
    `      calcMode="spline" keyTimes="0;0.5;1"`,
    `      keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>`,
    `  </text>`,
  ].join('\n');
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- terminal background -->
  <rect width="${W}" height="${H}" rx="10" fill="#0d1117"/>

  <!-- animated ~ wave -->
${waveChars.join('\n')}

  <!-- wordmark -->
  <text x="${W / 2}" y="122"
    text-anchor="middle"
    font-family="'Courier New',Courier,monospace"
    font-size="58" font-weight="bold" letter-spacing="4"
    fill="#22d3ee">tilde</text>

  <!-- subtitle -->
  <text x="${W / 2}" y="156"
    text-anchor="middle"
    font-family="'Courier New',Courier,monospace"
    font-size="13" fill="#7d8590">developer environment bootstrap</text>
</svg>`;

const out = path.join(__dirname, '..', 'docs', 'banner.svg');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, svg, 'utf8');
console.log('✓ Generated', out);
