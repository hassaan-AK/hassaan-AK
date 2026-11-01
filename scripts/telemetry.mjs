// Renders the "production dashboard" from the last 365 days of GitHub contributions.
//   In CI:   GITHUB_TOKEN=... node scripts/telemetry.mjs            (pulls GraphQL data)
//   Locally: node scripts/telemetry.mjs --seed data/seed-calendar.json
// Private-repo work only shows up if "Include private contributions" is on in your
// GitHub profile settings and your work email is added to your GitHub account.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { themes, MONO, SANS, esc } from './theme.mjs';

const LOGIN = process.env.PROFILE_LOGIN || 'hassaan-AK';

async function fromGitHub() {
  const query = `query($login:String!){ user(login:$login){ contributionsCollection {
    contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    totalPullRequestContributions totalPullRequestReviewContributions } } }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${await res.text()}`);
  const { data, errors } = await res.json();
  if (errors) throw new Error(JSON.stringify(errors));
  const c = data.user.contributionsCollection;
  const days = c.contributionCalendar.weeks.flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));
  return { days, prs: c.totalPullRequestContributions, reviews: c.totalPullRequestReviewContributions };
}

export function stats(days) {
  const total = days.reduce((s, d) => s + d.count, 0);
  const active = days.filter((d) => d.count > 0);
  let longest = 0, run = 0;
  for (const d of days) { run = d.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  // current streak tolerates "today" being empty (the day isn't over yet)
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue;
    else break;
  }
  const sorted = active.map((d) => d.count).sort((a, b) => a - b);
  const p50 = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const peak = active.reduce((m, d) => (d.count > m.count ? d : m), { count: 0, date: '-' });
  const byDow = Array(7).fill(0);
  for (const d of days) byDow[new Date(d.date + 'T00:00:00Z').getUTCDay()] += d.count;
  const busiest = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][byDow.indexOf(Math.max(...byDow))];
  const lastDeploy = active.length ? active[active.length - 1].date : '-';
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const weekly = weeks.map((w) => ({ start: w[0].date, count: w.reduce((s, d) => s + d.count, 0) }));
  return {
    total, activeDays: active.length, availability: (active.length / days.length) * 100, longest, current,
    p50, peak, busiest, lastDeploy, weekly,
  };
}

const fmtDay = (d) => (d === '-' ? d : new Date(d + 'T00:00:00Z').toLocaleString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }));

export function render(s, name, extra = {}) {
  const t = themes[name];
  const W = 860, H = 330;
  const card = (x, label, value, sub, color) => `
  <g transform="translate(${x},70)">
    <rect width="196" height="78" rx="8" fill="${t.panel}" stroke="${t.border}"/>
    <text x="14" y="22" font-family="${SANS}" font-size="11" fill="${t.muted}" letter-spacing="0.6">${esc(label.toUpperCase())}</text>
    <text x="14" y="52" font-family="${MONO}" font-size="24" font-weight="700" fill="${color}">${esc(value)}</text>
    <text x="14" y="69" font-family="${SANS}" font-size="11" fill="${t.muted}">${esc(sub)}</text>
  </g>`;

  // throughput chart
  const cx = 24, cy = 168, cw = W - 48, ch = 128;
  const max = Math.max(1, ...s.weekly.map((w) => w.count));
  const n = s.weekly.length, gap = 3, bw = (cw - 28 - gap * (n - 1)) / n;
  const bars = s.weekly.map((w, i) => {
    const h = Math.max(2, (w.count / max) * (ch - 48));
    const x = cx + 14 + i * (bw + gap), y = cy + ch - 22 - h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${w.count ? t.bar : t.barDim}"><title>week of ${w.start}: ${w.count}</title></rect>`;
  }).join('');
  const months = [];
  s.weekly.forEach((w, i) => {
    const d = new Date(w.start + 'T00:00:00Z');
    if (d.getUTCDate() <= 7) {
      months.push(`<text x="${(cx + 14 + i * (bw + gap)).toFixed(1)}" y="${cy + ch - 7}" font-family="${SANS}" font-size="10" fill="${t.muted}">${d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</text>`);
    }
  });

  const updated = extra.updated || new Date().toISOString().slice(0, 10);
  const prs = extra.prs != null ? ` · ${extra.prs} PRs · ${extra.reviews} reviews` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contribution dashboard: ${s.total} contributions in the last 12 months, active ${s.availability.toFixed(1)}% of days">
  <style>.pulse{animation:p 2s ease-in-out infinite}@keyframes p{0%,100%{opacity:1}50%{opacity:.25}}</style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.bg}" stroke="${t.border}"/>
  <circle class="pulse" cx="30" cy="34" r="6" fill="${t.green}"/>
  <text x="46" y="39" font-family="${SANS}" font-size="15" font-weight="600" fill="${t.text}">${esc(LOGIN)} / production</text>
  <text x="${46 + (LOGIN.length + 13) * 8.3}" y="39" font-family="${SANS}" font-size="13" fill="${t.green}">all systems operational</text>
  <text x="${W - 24}" y="39" text-anchor="end" font-family="${MONO}" font-size="11" fill="${t.muted}">updated ${esc(updated)} UTC</text>
  ${card(24, 'Contributions · 12 mo', s.total.toLocaleString('en'), `p50 ${s.p50}/active day${prs}`, t.text)}
  ${card(232, 'Active days', `${s.activeDays}`, `${s.availability.toFixed(1)}% of the last 365`, t.green)}
  ${card(440, 'Longest streak', `${s.longest}d`, `busiest day: ${s.busiest}`, t.orange)}
  ${card(648, 'Last deploy', fmtDay(s.lastDeploy), `current streak: ${s.current}d`, t.blue)}
  <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="8" fill="${t.panel}" stroke="${t.border}"/>
  <text x="${cx + 14}" y="${cy + 20}" font-family="${SANS}" font-size="11" fill="${t.muted}" letter-spacing="0.6">THROUGHPUT · CONTRIBUTIONS / WEEK</text>
  <text x="${cx + cw - 14}" y="${cy + 20}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${t.muted}">peak ${s.peak.count} on ${esc(s.peak.date)}</text>
  ${bars}
  ${months.join('')}
</svg>
`;
}

async function main() {
  const seedIdx = process.argv.indexOf('--seed');
  let days, extra = {};
  if (seedIdx > -1) {
    days = JSON.parse(readFileSync(process.argv[seedIdx + 1], 'utf8')).days;
    extra.updated = days[days.length - 1].date;
  } else {
    const g = await fromGitHub();
    days = g.days; extra = { prs: g.prs, reviews: g.reviews };
  }
  const s = stats(days);
  mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
  for (const name of ['dark', 'light']) {
    writeFileSync(new URL(`../assets/telemetry-${name}.svg`, import.meta.url), render(s, name, extra));
  }
  console.log(`telemetry: ${s.total} contributions, ${s.availability.toFixed(1)}% days active`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
