const fs = require('fs');
const path = require('path');

async function testCloudinary() {
  const filePath = path.join(__dirname, 'test.jpg');
  // create a dummy image (base64 of a 1x1 pixel)
  const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  
  const formData = new FormData();
  formData.append('file', base64Image);
  formData.append('upload_preset', 'docs_upload_example_us_preset');

  const response = await fetch('https://api.cloudinary.com/v1_1/demo/image/upload', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  console.log(data);
}

testCloudinary().catch(console.error);
