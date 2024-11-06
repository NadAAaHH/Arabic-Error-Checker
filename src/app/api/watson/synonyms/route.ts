import { NextResponse } from 'next/server';

async function getAccessToken() {
  const apiKey = process.env.IBM_WATSONX_API_KEY;
  const tokenUrl = "https://iam.cloud.ibm.com/identity/token";
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const data = new URLSearchParams({
    "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
    "apikey": apiKey || ''
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: data
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain access token: ${response.statusText}`);
  }

  const responseJson = await response.json();
  if (!responseJson.access_token) {
    throw new Error("Access token not found in response");
  }

  return responseJson.access_token;
}

async function generateSynonyms(prompt: string, accessToken: string) {
  const projectId = process.env.IBM_WATSONX_PROJECT_ID;
  const url = "https://eu-de.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29";
  const modelId = "sdaia/allam-1-13b-instruct";

  console.log('Sending prompt to Watson:', prompt);

  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`
  };

  const body = {
    "input": `<s> [INST] ${prompt} [/INST]`,
    "parameters": {
      "decoding_method": "greedy",
      "max_new_tokens": 400,
      "temperature": 0.7
    },
    "model_id": modelId,
    "project_id": projectId
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    console.error('Watson API error:', await response.text());
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('Watson API response:', result);
  return result;
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    console.log('Received prompt:', prompt);
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();
    const result = await generateSynonyms(prompt, accessToken);

    console.log('Sending response:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
