const fs = require('fs');
const path = require('path');

async function testCloudflare() {
  const filePath = path.join(__dirname, 'test.txt');
  fs.writeFileSync(filePath, 'Hello Cloudflare');

  const formData = new FormData();
  formData.append('file', new Blob([fs.readFileSync(filePath)]), 'test.txt');

  try {
    const response = await fetch('https://white-band-a912.shahidhussain-tech.workers.dev/upload', {
      method: 'POST',
      body: formData
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testCloudflare();
