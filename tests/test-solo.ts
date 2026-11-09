const BASE_URL = 'http://localhost:3000';

async function testSolo() {
  console.log('Testing Solo Session...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/masuk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'guru@discere.local',
      kataSandi: 'GuruDiscere2026!',
    }),
  });
  const cookie = loginRes.headers.get('set-cookie')!.split(';')[0];

  const tmplRes = await fetch(`${BASE_URL}/api/template`, { headers: { Cookie: cookie } });
  const tmpl = (await tmplRes.json()).templates[0];

  // Buat sesi solo
  const sesiRes = await fetch(`${BASE_URL}/api/sesi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ templateId: tmpl.id, mode: 'solo' }),
  });
  const sesiData = await sesiRes.json();
  if (sesiData.session.mode !== 'solo') throw new Error('Expected solo mode');
  console.log('✓ Solo session created:', sesiData.session.id);

  // Ambil detail
  const detailRes = await fetch(`${BASE_URL}/api/sesi/${sesiData.session.id}`, { headers: { Cookie: cookie } });
  const detailData = await detailRes.json();
  if (detailData.session.mode !== 'solo') throw new Error('Expected solo detail');
  console.log('✓ Solo detail verified:', detailData.session.state);

  console.log('✓ All Solo tests passed!');
}

testSolo().catch(console.error);
