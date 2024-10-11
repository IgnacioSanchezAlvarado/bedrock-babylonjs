// bedrockApi.js
async function generateImage(prompt) {
  const apiUrl = 'https://z4wewjkyha.execute-api.us-west-2.amazonaws.com/default/capstone-babylonjs-generate-image';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate image');
    }

    const data = await response.json();
    return data.imageUrl; // Assuming the Lambda function returns a URL to the generated image
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

async function callBedrockAPI(prompt, meshConfig) {
  const apiURLTriage = 'https://zh5hq6j6tj.execute-api.us-west-2.amazonaws.com/default/capstone-babylonjs-promptflow';
  let url = null;

  try {
    // First API call
    const triageResponse = await fetch(apiURLTriage, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        meshConfig: meshConfig
      })
    });

    if (!triageResponse.ok) {
      throw new Error(`HTTP error! status: ${triageResponse.status}`);
    }

    const triageData = await triageResponse.json();
    const parsedTriageData = JSON.parse(triageData.response);
    console.log(parsedTriageData);
    

    if (parsedTriageData.topic === "image") {
      console.log(`Image query detected for object: ${parsedTriageData.object}`);
      // Create a deep copy of meshConfig
      const updatedMeshConfig = JSON.parse(meshConfig);
      console.log(typeof updatedMeshConfig); 
      
      console.log('Searching for object:', parsedTriageData.object);
      
      let objectFound = false;
      for (const key in updatedMeshConfig) {
        const item = updatedMeshConfig[key];
        //console.log(`Checking object ${key}:`, item.name);
        if (item.name && item.name.toLowerCase() === parsedTriageData.object.toLowerCase()) {
          item.texture = true;
          objectFound = true;
          //Call api function to create image based on the prompt and save it locally with the mesh name
          const preUrl = await generateImage(prompt);
          url = [preUrl, item.name];
          console.log(`Updated texture for object: ${item.name}`);
          break;
        }
      }
      
      if (!objectFound) {
        console.warn(`Object "${parsedTriageData.object}" not found in meshConfig`);
      }
   
      return [url, JSON.stringify(updatedMeshConfig)];
    } else {
      // Second API call
      const apiUrl = 'https://bies9qjdf5.execute-api.us-west-2.amazonaws.com/default/babylonjs-capstone-bedrock-call';
      
      const bedrockResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          meshConfig: meshConfig
        })
      });

      if (!bedrockResponse.ok) {
        throw new Error(`HTTP error! status: ${bedrockResponse.status}`);
      }

      const bedrockData = await bedrockResponse.json();
      return [url, bedrockData.response];
    }
  } catch (error) {
    console.error('Error calling API:', error);
    throw error;
  }
}

export { callBedrockAPI };