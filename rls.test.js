/* Row level security, tested on a real Postgres.

   Starts a throwaway Postgres, adds the parts of Supabase the rules depend on
   (supabase/tests/supabase-stub.sql), applies every migration in
   supabase/migrations in order, then runs supabase/tests/rls.sql, which acts
   as two people and a signed-out visitor and reports one row per check.

   Needs the Postgres server programs (initdb, pg_ctl) and psql. GitHub's
   Ubuntu runners have them. Set PG_BIN to point somewhere else. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ok = [], bad = [];
const t = (name, pass, why) => (pass ? ok : bad).push(name + (pass || !why ? '' : ' (' + why + ')'));
const report = () => {
  console.log('PASS ' + ok.length);
  ok.forEach(x => console.log('  + ' + x));
  if (bad.length) { console.log('FAIL ' + bad.length); bad.forEach(x => console.log('  - ' + x)); }
  process.exit(bad.length ? 1 : 0);
};

function findBin() {
  const tries = [process.env.PG_BIN];
  try { for (const v of fs.readdirSync('/usr/lib/postgresql').sort().reverse()) tries.push('/usr/lib/postgresql/' + v + '/bin'); } catch (e) {}
  tries.push('/usr/local/bin', '/opt/homebrew/bin', '/usr/bin');
  return tries.find(d => d && fs.existsSync(path.join(d, 'initdb')) && fs.existsSync(path.join(d, 'pg_ctl')));
}

const bin = findBin();
if (!bin) { t('a Postgres server is available to test against (set PG_BIN)', false, 'initdb and pg_ctl not found'); report(); }

/* Postgres refuses to run as root, so a root shell runs it as nobody. */
const asUser = process.getuid && process.getuid() === 0 ? { uid: 65534, gid: 65534 } : {};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-rls-'));
if (asUser.uid) fs.chownSync(dir, asUser.uid, asUser.gid);
const data = path.join(dir, 'data');
const port = String(54000 + Math.floor(Math.random() * 1000));
const run = (cmd, args, extra) => execFileSync(path.join(bin, cmd), args, Object.assign({ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: dir }, asUser, extra));
const psql = (args) => execFileSync(fs.existsSync(path.join(bin, 'psql')) ? path.join(bin, 'psql') : 'psql',
  ['-h', dir, '-p', port, '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1'].concat(args),
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

let started = false;
try {
  run('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale']);
  run('pg_ctl', ['-D', data, '-w', '-l', path.join(dir, 'log'), '-o', `-p ${port} -k ${dir} -c listen_addresses=''`, 'start']);
  started = true;

  psql(['-f', path.join(__dirname, 'supabase/tests/supabase-stub.sql')]);
  const migs = fs.readdirSync(path.join(__dirname, 'supabase/migrations')).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort();
  t('migrations are numbered with no gaps or repeats', migs.every((f, i) => +f.slice(0, 4) === i + 1), migs.join(', '));
  for (const f of migs) {
    try { psql(['-f', path.join(__dirname, 'supabase/migrations', f)]); t('migration ' + f + ' applies to a clean database', true); }
    catch (e) { t('migration ' + f + ' applies to a clean database', false, String(e.stderr || e.message).trim().split('\n')[0]); throw e; }
  }

  const out = psql(['-tA', '-F', '|', '-f', path.join(__dirname, 'supabase/tests/rls.sql')]);
  /* only the final report's rows (n|t or f|name); set_config and friends print their values too */
  const rows = out.split('\n').filter(l => /^\d+\|[tf]\|/.test(l)).map(l => l.split('|'));
  t('the RLS checks ran', rows.length >= 20, rows.length + ' checks reported');
  for (const [, pass, name] of rows) t('RLS: ' + name, pass === 't');
} catch (e) {
  if (!bad.length) t('the RLS run completed', false, String(e.stderr || e.message).trim().split('\n').slice(0, 3).join(' / '));
} finally {
  if (started) { try { run('pg_ctl', ['-D', data, '-m', 'immediate', 'stop']); } catch (e) {} }
  fs.rmSync(dir, { recursive: true, force: true });
}
report();
