const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert/strict'), crypto = require('crypto');
(async () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-backup-restore-'));
    process.chdir(sandbox);
    process.env.DATABASE_PATH = path.join(sandbox, 'test.db');
    process.env.BACKUP_PATH = path.join(sandbox, 'backups');
    for (const k of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_API_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_KEY'])
        process.env[k] = '';
    const db = require('../server/db/connection.ts'), schema = require('../server/db/schema.ts');
    await db.initDb();
    await schema.initializeDatabase();
    await db.runQuery("INSERT INTO users(id,name,email,role,status,access_level) VALUES('qa-admin','QA Admin','qa@example.test','Admin','Active','Editor')");
    const hash = () => crypto.createHash('sha256').update(fs.readFileSync(db.dbPath)).digest('hex');
    const source = process.argv[2];
    if (!source)
        throw new Error('Pass the full path to the 12-lead backup fixture.');
    const buffer = fs.readFileSync(source), sourceHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const before = hash();
    await assert.rejects(async () => await db.restoreDatabaseFromBuffer(Buffer.from('invalid backup'), schema.initializeDatabase), /valid CRM/);
    assert.equal(hash(), before);
    await assert.rejects(async () => await db.restoreDatabaseFromBuffer(buffer, async () => { await db.runQuery("UPDATE leads SET name='QA changed'"); throw new Error('QA migration failed'); }), /QA migration failed/);
    assert.equal(hash(), before, 'Failed migration must not overwrite disk');
    assert.equal((await db.queryOne('SELECT COUNT(*) AS count FROM leads')).count, 0, 'Failed migration must retain active database');
    const express = require('express'), app = express(), auth = require('../server/middleware/auth.ts');
    let cookie;
    await auth.createSession('qa-admin', { cookie: (name, value) => cookie = name + '=' + value });
    app.use(express.json({ limit: '50mb' }));
    app.use('/api', auth.apiAuthorization);
    app.use('/api/settings', require('../server/routes/settings.ts').default);
    app.use(require('../server/middleware/errorHandler.ts').errorHandler);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    try {
        const url = 'http://127.0.0.1:' + server.address().port + '/api/settings/backup/restore-upload';
        assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: Buffer.from('no auth') })).status, 401);
        const response = await fetch(url, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/octet-stream' }, body: buffer });
        const result = await response.json();
        assert.equal(response.status, 200, JSON.stringify(result));
        assert.equal((await db.queryOne('SELECT COUNT(*) AS count FROM leads')).count, 12);
        assert.equal((await db.queryOne('PRAGMA integrity_check')).integrity_check, 'ok');
        assert.ok(db.listBackupSnapshots().some(s => s.filename.includes('pre-restore')));
        assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'), sourceHash, 'Supplied backup stays unchanged');
        console.log('PASS: 51.9 MB binary import over HTTP, admin authorization, integrity check, 12 restored leads, pre-restore snapshot, migration failure rollback, unchanged original backup.');
    }
    finally {
        await new Promise(r => server.close(r));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
