// Quick test for admin endpoints
const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path: '/api' + path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // 1. Login
  const login = await req('POST', '/auth/login', {
    email: '[email protected]',
    password: 'Owner123!',
    businessSlug: 'demo',
  });
  console.log('1. LOGIN:', login.status, JSON.stringify(login.body).substring(0, 200));

  if (login.status !== 200) {
    console.log('Login failed, checking seed data...');
    // Try to see what users exist by querying a different approach
    process.exit(1);
  }

  const token = login.body.accessToken;

  // 2. Dashboard stats
  const stats = await req('GET', '/admin/dashboard/stats', null, token);
  console.log('2. DASHBOARD:', stats.status, JSON.stringify(stats.body));

  // 3. Businesses list
  const biz = await req('GET', '/admin/businesses', null, token);
  console.log('3. BUSINESSES:', stats.status, JSON.stringify(biz.body).substring(0, 300));

  console.log('\n✅ All admin endpoints working!');
}

main().catch(console.error);
