const fs = require('fs');
const path = require('path');

async function testUguu() {
  const filePath = path.join(__dirname, 'test.txt');
  fs.writeFileSync(filePath, 'Hello World');

  const formData = new FormData();
  formData.append('files[]', new Blob([fs.readFileSync(filePath)]), 'test.txt');

  const response = await fetch('https://uguu.se/upload.php', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  console.log(data);
}

testUguu().catch(console.error);
