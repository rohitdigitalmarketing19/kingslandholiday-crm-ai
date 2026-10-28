const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { build } = require('esbuild');
const proxyaddr = require('proxy-addr');

async function main() {
  // A malformed mapped subnet must never trust unrelated IPv4 clients.
  assert.equal(proxyaddr.compile('::ffff:10.0.0.0/8')('203.0.113.10'), false);
  assert.equal(proxyaddr.compile('::/1')('203.0.113.10'), false);
  assert.equal(proxyaddr.compile('10.0.0.0/8')('10.1.2.3'), true);
  assert.equal(proxyaddr.compile('10.0.0.0/8')('203.0.113.10'), false);
  assert.equal(proxyaddr.compile('::ffff:10.0.0.0/104')('10.1.2.3'), true);

  // Exercise the real audit function with a mocked persistence boundary.
  const result = await build({
    entryPoints: [path.join(__dirname, '../server/controllers/clientDocumentsController.ts')],
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
    plugins: [{ name: 'mock-audit-database', setup(builder) {
      builder.onResolve({ filter: /db\/connection$/ }, () => ({ path: 'audit-db', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents:
        'export const queryAll = () => []; export const queryOne = () => null; export const runQuery = (...args) => globalThis.__auditWrites.push(args);'
      }));
    } }],
  });
  const auditWrites = [];
  const sandbox = {
    module: { exports: {} }, exports: {}, require, console, process, Buffer,
    __auditWrites: auditWrites,
  };
  vm.runInNewContext(result.outputFiles[0].text, sandbox);
  const audit = sandbox.module.exports.logDocumentAudit;
  for (const forged of ['198.51.100.99', ['198.51.100.99', '198.51.100.100']]) {
    audit('doc-test', 'lead-test', 'view', {
      ip: '203.0.113.20', socket: { remoteAddress: '127.0.0.1' },
      headers: { 'x-forwarded-for': forged, 'user-agent': 'security-regression' },
    }, { userId: 'test-user', userName: 'Test User' });
    assert.equal(auditWrites.at(-1)[1][6], '203.0.113.20');
  }
  audit('doc-test', 'lead-test', 'view', {
    socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '198.51.100.99' },
  }, { userId: 'test-user', userName: 'Test User' });
  assert.equal(auditWrites.at(-1)[1][6], '127.0.0.1');
  assert.equal(auditWrites.length, 3);
  // Compile the same from/to/subject/html mail shape used by the CRM without SMTP.
  const nodemailer = require('nodemailer');
  const smtp = nodemailer.createTransport({
    host: 'smtp.example.invalid', port: 587, secure: false,
    auth: { user: 'sender@example.invalid', pass: 'test-only' },
  });
  assert.equal(typeof smtp.verify, 'function');
  smtp.close();
  const mailer = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const mail = await mailer.sendMail({
    from: '"Kingsland Holidays" <sender@example.invalid>',
    to: 'recipient@example.invalid', subject: 'CRM security regression',
    html: '<p>Test OTP: 123456</p>',
  });
  assert.deepEqual(mail.envelope.to, ['recipient@example.invalid']);
  assert.match(mail.message.toString(), /Test OTP: 123456/);
  mailer.close();
  console.log('PASS: proxy subnet isolation, forged audit IP checks, and offline email compilation');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
