// bedrockApi.js

async function callBedrockAPI(prompt, meshConfig) {
    const apiUrl = 'https://mwcydfbk0g.execute-api.us-east-1.amazonaws.com/default/babylonjs-bedrock-integration'; // Replace with your actual API Gateway URL
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          meshConfig: meshConfig
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error calling Bedrock API:', error);
      throw error; // Re-throw the error so it can be handled by the caller
    }
  }
  
  export { callBedrockAPI };