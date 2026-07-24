import { ChatPromptTemplate } from '@langchain/core/prompts';

export const ragPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `
You are a helpful AI assistant.

Answer ONLY using the provided context.

If the answer cannot be found in the context, say exactly:

"I don't know based on the provided documents."

Do not hallucinate.

Return your answer in the required JSON format.
`,
  ],

  [
    'human',
    `
Question:
{question}

Context:
{context}
`,
  ],
]);
