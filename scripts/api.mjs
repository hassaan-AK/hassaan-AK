// The README "API". Triggered when someone opens an issue titled "api: <METHOD> <path>".
// Replies with a fake-but-honest HTTP response, closes the issue, and logs the call in README.md.
// Local test: DRY_RUN=1 ISSUE_TITLE="api: GET /stack" ISSUE_USER=octocat node scripts/api.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const {
  GITHUB_TOKEN, GITHUB_REPOSITORY = 'hassaan-AK/hassaan-AK', DRY_RUN,
  ISSUE_NUMBER, ISSUE_TITLE = '', ISSUE_USER = 'someone', ISSUE_CREATED_AT,
} = process.env;

const CONTACT = {
  email: 'hassaanasifkhan@gmail.com',
  linkedin: 'https://www.linkedin.com/in/hassaan-ak/',
  timezone: 'UTC+5 (full overlap with UK/EU, mornings with US East)',
};

const sinceAug2022 = () => {
  const ms = Date.now() - Date.UTC(2022, 7, 1);
  return (ms / (365.25 * 864e5)).toFixed(1);
};

const routes = {
  'GET /whoami': () => [200, {
    name: 'Hassaan Asif Khan', role: 'Backend Engineer', based_in: 'Lahore, Pakistan',
    summary: 'I build and run production Node.js/TypeScript backends: APIs, real-time, payments, and the security + observability that keep them up.',
    open_to: 'remote roles, full-time or contract',
  }],
  'GET /stack': () => [200, {
    languages: ['TypeScript', 'JavaScript', 'Python', 'SQL'],
    backend: ['NestJS', 'Express', 'Socket.IO', 'BullMQ', 'Stripe', 'OpenAPI'],
    data: ['MongoDB', 'PostgreSQL', 'Redis', 'OpenSearch'],
    cloud: ['AWS (EC2, S3, CloudFront, SES, SSM)', 'Docker', 'GitHub Actions', 'Railway', 'Vercel'],
    reliability: ['OpenTelemetry', 'Sentry', 'Jest/Supertest e2e', 'SonarQube'],
    learning: ['RAG', 'LLM agents', 'FastAPI'],
  }],
  'GET /projects': () => [200, [
    { name: 'SealPact', what: 'legal e-signature SaaS', me: 'sole owner; closed 15+ security audit findings; OpenTelemetry; Stripe' },
    { name: 'URY super-app', what: 'social + marketplace + live streaming', me: 'time-decay feed ranking, moderation, OpenSearch, BullMQ media workers' },
    { name: 'nestjs chat package', what: 'reusable real-time chat', me: 'Socket.IO + Redis adapter, presence, coalesced notifications' },
    { name: 'National Ramp', what: 'US accessibility-equipment ops platform', me: '540+ commits; workflows + Epicor ERP integration' },
    { name: 'Dopamine Club', what: 'live PC-hardware marketplace', me: 'founder + sole engineer', url: 'https://dopamineclub.pk' },
  ]],
  'GET /uptime': () => [200, {
    shipping_since: '2022-08', years: Number(sinceAug2022()),
    incidents_handled: 'yes, and I write the postmortem',
    note: 'see the telemetry panel in the README for the last 12 months',
  }],
  'POST /hire': () => [201, {
    message: 'Request received. I get a notification for this issue and will reply here.',
    next: 'Leave a comment with the role, team, and a link to the job post.',
    ...CONTACT,
  }],
  'BREW /coffee': () => [418, { error: "I'm a teapot", hint: 'RFC 2324. Try POST /hire instead.' }],
};

const STATUS_TEXT = { 200: 'OK', 201: 'Created', 404: 'Not Found', 418: "I'm a teapot" };

export function handle(title) {
  const m = title.slice(0, 60).match(/^api:\s*([A-Za-z]+)\s+(\/[A-Za-z0-9/_-]*)\s*$/);
  const key = m ? `${m[1].toUpperCase()} ${m[2].toLowerCase().replace(/\/+$/, '') || '/'}` : null;
  if (key && routes[key]) {
    const [status, body] = routes[key]();
    return { key, status, body };
  }
  return {
    key: key || 'GET /?',
    status: 404,
    body: { error: 'route not found', try: Object.keys(routes) },
  };
}

export function updateLog(readme, row, keep = 8) {
  const START = '<!--REQUEST_LOG_START-->', END = '<!--REQUEST_LOG_END-->';
  const a = readme.indexOf(START), b = readme.indexOf(END);
  if (a < 0 || b < 0) return readme;
  const inner = readme.slice(a + START.length, b).split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Time') && !l.includes('waiting for the first request'));
  const rows = [row, ...inner].slice(0, keep);
  const table = ['', '| Time (UTC) | Caller | Request | Status |', '|---|---|---|---|', ...rows, ''].join('\n');
  return readme.slice(0, a + START.length) + table + readme.slice(b);
}

async function gh(method, path, body) {
  if (DRY_RUN) { console.log(`[dry-run] ${method} ${path}`, body ? JSON.stringify(body).slice(0, 400) : ''); return; }
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    method,
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
}

async function main() {
  const { key, status, body } = handle(ISSUE_TITLE);
  const started = ISSUE_CREATED_AT ? new Date(ISSUE_CREATED_AT).getTime() : Date.now() - 1;
  const latency = Math.max(1, Date.now() - started);
  const user = ISSUE_USER.replace(/[^A-Za-z0-9-]/g, '');

  const comment = [
    '```http',
    `HTTP/1.1 ${status} ${STATUS_TEXT[status]}`,
    'content-type: application/json',
    'x-served-by: github-actions (yes, this README is the server)',
    `x-latency: ${latency}ms`,
    '',
    JSON.stringify(body, null, 2),
    '```',
    status === 201 ? '' : '_This issue closes itself. Your call is now in the request log on my profile._',
  ].join('\n');

  await gh('POST', `/issues/${ISSUE_NUMBER}/comments`, { body: comment });
  if (status === 201) await gh('POST', `/issues/${ISSUE_NUMBER}/labels`, { labels: ['hire'] });
  else await gh('PATCH', `/issues/${ISSUE_NUMBER}`, { state: 'closed', state_reason: 'completed' });

  const when = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const icon = status < 300 ? '🟢' : status === 418 ? '🫖' : '🔴';
  const row = `| ${when} | [@${user}](https://github.com/${user}) | \`${key}\` | ${icon} ${status} |`;
  const path = new URL('../README.md', import.meta.url);
  writeFileSync(path, updateLog(readFileSync(path, 'utf8'), row));
  console.log(`${key} -> ${status} for @${user}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
