const fs = require('fs')
const UNIFY_API_URL = 'https://api.qa.unifyapps.com/api-endpoint/figma/Fetch-Figma-Details';
const FIGMA_URL = 'https://www.figma.com/design/4r7C2sI9cktH4T8atJhmrW/Component-Sheet?node-id=1-5780&t=5pGcXXUh8vqiyqPP-4';

async function fetchFigmaData() {
  const data = { fileUrl: FIGMA_URL };

  try {
    const response = await fetch(UNIFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const figmaJson = await response.json();
    fs.writeFileSync('figma.json', JSON.stringify(figmaJson, null, 2), 'utf8');
    console.log('Figma data saved to figma.json');
  } catch (error) {
    console.error('Error fetching Figma data:', error);
    process.exit(1);
  }
}

fetchFigmaData();