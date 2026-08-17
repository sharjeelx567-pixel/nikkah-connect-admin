async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/admin-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Alert from Script',
        body: 'Testing the API directly from Node',
        type: 'photo_upload',
        targetUid: '123'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', data);
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}
test();
