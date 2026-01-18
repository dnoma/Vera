export type ChatMessage = {
  readonly role: 'system' | 'user';
  readonly content: string;
};

export type OpenAIChatRequest = {
  readonly model: string;
  readonly temperature: number;
  readonly messages: readonly ChatMessage[];
};

export type OpenAIChatResponse = {
  readonly content: string;
};

type ChatCompletionsResponse = {
  readonly choices: readonly {
    readonly message: { readonly content: string | null };
  }[];
};

export async function openAIChatJson(
  request: OpenAIChatRequest,
  apiKey: string
): Promise<OpenAIChatResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      temperature: request.temperature,
      messages: request.messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as ChatCompletionsResponse;
  const content = json.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI response missing content');
  }
  return { content };
}

