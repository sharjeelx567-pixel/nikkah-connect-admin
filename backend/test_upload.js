const fs = require('fs');
const path = require('path');

async function testUpload() {
  const filePath = path.join(__dirname, 'test.txt');
  fs.writeFileSync(filePath, 'Hello World');

  const formData = new FormData();
  formData.append('file', new Blob([fs.readFileSync(filePath)]), 'test.txt');

  const response = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  console.log(data);
}

testUpload().catch(console.error);
