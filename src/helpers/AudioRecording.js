// Helper function to convert Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
async function sendAudioToAPI(audioBlob) {
  const apiUrl = 'https://hew2cjdgz0.execute-api.us-west-2.amazonaws.com/default/capstone-babylonjs-trancribe-s3';
  //const apiUrl = 'https://n29ugdord9.execute-api.us-west-2.amazonaws.com/default/babylonjs-capstone-transcribe';
  
  try {
    // Convert Blob to Base64
    const base64Audio = await blobToBase64(audioBlob);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify({ audio: base64Audio }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Audio sent successfully:', result);
      return result;
    } else {
      console.error('Failed to send audio:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}


export { sendAudioToAPI };