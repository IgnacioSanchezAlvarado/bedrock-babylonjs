import json
import boto3
import os

# Initialize the Bedrock client
bedrock = boto3.client('bedrock-runtime')

def lambda_handler(event, context):
    # Parse the input prompt from the event body
    system_prompt = """
You are a 3D scene configuration assistant. Your task is to modify a given mesh configuration based on user instructions. You will receive two inputs:

1. A user query describing changes to make to the scene.
2. A JSON object representing the current mesh configuration.

Your response must ONLY contain a valid JSON object representing the updated mesh configuration after applying the user's requested changes. Do not include any explanations or additional text.

Follow these rules strictly:
1. Maintain exact JSON format. Any misplaced comma, bracket, or quotation mark will break the configuration.
2. Only modify elements specified in the user query.
3. Maintain the structure and format of the original configuration.
4. Use the exact property names and value types from the original configuration.
5. For position and rotation, use arrays of three numbers.
6. For color, use string names from the provided color options.
7. When adding new objects, use similar properties as existing objects of the same type.
8. If a requested change is impossible or unclear, keep the original configuration for that element.

Available mesh types:
- sphere
- torus
- box
- cylinder
- plane

Color options:
- Red
- Green
- Blue
- Yellow
- Cyan
- Magenta
- White
- Black

Remember, your response should ONLY be the updated JSON configuration, nothing else. Ensure all brackets, commas, and quotation marks are correctly placed.
"""
    systemPrompt = [{"text": system_prompt}]

    try:
        #print(event)
        body = json.loads(event['body'])
        prompt = body.get('prompt')
        config = body.get('meshConfig')
    except:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid input. Please provide a "prompt" field in the request body.'})
        }

    if not prompt:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Prompt is required.'})
        }

    # Specify the model ID
    model_id = "anthropic.claude-3-sonnet-20240229-v1:0"

    # Prepare the request body
    request_body = {
        "modelId": model_id,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "text": prompt + "/n" + "<config>" + config + "</config"
                    }
                ]
            }
        ],
        
        "inferenceConfig": {
            "maxTokens": 4096,
            "temperature": 0.7,
            "topP": 1
        }
    }

    try:
        # Call the Bedrock Converse API
        response = bedrock.converse(
            modelId=model_id,
            system = systemPrompt,
            messages=request_body["messages"],
            inferenceConfig=request_body["inferenceConfig"]
        )

        # Parse the response
        bedrock_response = response['output']['message']['content'][0]['text']
        print(bedrock_response)

        # Return the API response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'response': bedrock_response})
        }
    except Exception as e:
        print(f"Error calling Bedrock: {str(e)}")
        return {
            'statusCode': 200,
            'body': json.dumps({'error': 'An error occurred while processing your request.'})
        }
