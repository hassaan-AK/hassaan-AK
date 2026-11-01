// Renders the animated terminal header: assets/hero-dark.svg + assets/hero-light.svg
// Edit PROFILE below, then run: node scripts/hero.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { themes, MONO, esc } from './theme.mjs';

const COMMAND = 'curl -s localhost:3000/v1/me | jq';
const PROFILE = [
  ['name', 'Hassaan Asif Khan'],
  ['role', 'Backend Engineer'],
  ['stack', ['Node.js', 'TypeScript', 'NestJS', 'MongoDB', 'PostgreSQL', 'Redis']],
  ['ships', 'APIs · real-time · payments · observability'],
  ['learning', 'Python · RAG · agents'],
  ['location', 'Lahore, PK (UTC+5)'],
  ['open_to', 'remote · full-time or contract'],
];

const W = 860, LH = 22, FS = 15, CW = 9.03; // CW = approx monospace char width at 15px
const PAD_X = 28, TOP = 64;

function jsonLine(key, value, t, last) {
  const k = `<tspan fill="${t.blue}">"${esc(key)}"</tspan><tspan fill="${t.text}">: </tspan>`;
  let v;
  if (Array.isArray(value)) {
    v = `<tspan fill="${t.text}">[</tspan>` + value
      .map((x) => `<tspan fill="${t.string}">"${esc(x)}"</tspan>`)
      .join(`<tspan fill="${t.text}">, </tspan>`) + `<tspan fill="${t.text}">]</tspan>`;
  } else {
    v = `<tspan fill="${t.string}">"${esc(value)}"</tspan>`;
  }
  return `  ${k}${v}${last ? '' : `<tspan fill="${t.text}">,</tspan>`}`;
}

function render(name) {
  const t = themes[name];
  const typeStart = 0.4, typeDur = COMMAND.length * 0.045;
  const outStart = typeStart + typeDur + 0.35;
  const lines = [
    `<tspan fill="${t.text}">{</tspan>`,
    ...PROFILE.map(([k, v], i) => jsonLine(k, v, t, i === PROFILE.length - 1)),
    `<tspan fill="${t.text}">}</tspan>`,
  ];
  const H = TOP + LH * (lines.length + 3) + 18;
  const cmdY = TOP;
  const outY = (i) => TOP + LH * (i + 1.4);
  const footY = outY(lines.length) + 8;
  const cmdW = COMMAND.length * CW + 4;

  const out = lines.map((l, i) => {
    const begin = (outStart + i * 0.09).toFixed(2);
    return `<text x="${PAD_X}" y="${outY(i)}" xml:space="preserve" opacity="0">${l}` +
      `<set attributeName="opacity" to="1" begin="${begin}s" fill="freeze"/></text>`;
  }).join('\n    ');

  const footBegin = (outStart + lines.length * 0.09 + 0.2).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Terminal: curl /v1/me returns Hassaan Asif Khan, Backend Engineer, Node.js TypeScript NestJS, open to remote work">
  <defs>
    <clipPath id="type"><rect x="${PAD_X + 18}" y="${cmdY - 16}" height="22" width="0">
      <animate attributeName="width" from="0" to="${cmdW}" begin="${typeStart}s" dur="${typeDur.toFixed(2)}s" fill="freeze" calcMode="discrete" values="${Array.from({ length: COMMAND.length + 1 }, (_, i) => (i * CW).toFixed(1)).join(';')}"/>
    </rect></clipPath>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.bg}" stroke="${t.border}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="34" rx="12" fill="${t.panel}"/>
  <rect x="0.5" y="22" width="${W - 1}" height="13" fill="${t.panel}"/>
  <line x1="0" y1="35" x2="${W}" y2="35" stroke="${t.border}"/>
  <circle cx="22" cy="18" r="6" fill="#ff5f57"/><circle cx="42" cy="18" r="6" fill="#febc2e"/><circle cx="62" cy="18" r="6" fill="#28c840"/>
  <text x="${W / 2}" y="22" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${t.muted}">hassaan@prod: ~</text>
  <g font-family="${MONO}" font-size="${FS}">
    <text x="${PAD_X}" y="${cmdY}" fill="${t.green}">$</text>
    <text x="${PAD_X + 18}" y="${cmdY}" fill="${t.text}" clip-path="url(#type)" xml:space="preserve">${esc(COMMAND)}</text>
    ${out}
    <text x="${PAD_X}" y="${footY}" opacity="0"><tspan fill="${t.green}">HTTP/1.1 200 OK</tspan><tspan fill="${t.muted}">  ·  served in 23ms  ·  </tspan><tspan fill="${t.orange}">open the request log below ↓</tspan><set attributeName="opacity" to="1" begin="${footBegin}s" fill="freeze"/></text>
    <rect x="${PAD_X}" y="${footY + 10}" width="9" height="17" fill="${t.text}" opacity="0">
      <set attributeName="opacity" to="1" begin="${footBegin}s"/>
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.1s" begin="${footBegin}s" repeatCount="indefinite"/>
    </rect>
  </g>
</svg>
`;
}

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
for (const name of ['dark', 'light']) {
  writeFileSync(new URL(`../assets/hero-${name}.svg`, import.meta.url), render(name));
}
console.log('hero SVGs written');
