export interface ErrorItem {
  "خطأ": string;
  "نوع الخطأ"?: string;
  "تصحيح الكلمة"?: string;
  "نوع_الخطأ"?: string;
  "تصحيح_الكلمة"?: string;
}

export type WatsonResponse = ErrorItem[];

export class IBMWatsonAPI {
  async generateText(prompt: string): Promise<WatsonResponse> {
    const response = await fetch('/api/watson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate text');
    }

    const data = await response.json();
    const text = data.results[0].generated_text;
    
    // Convert the text to proper JSON array format
    const formattedText = `[${text.replace(/}\s*,\s*{/g, '}, {')}]`;
    return JSON.parse(formattedText);
  }
}

export const watsonApi = new IBMWatsonAPI();
