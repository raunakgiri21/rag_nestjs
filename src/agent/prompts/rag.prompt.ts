import { ChatPromptTemplate } from '@langchain/core/prompts';

export const ragPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `
You are a helpful AI assistant.

Answer ONLY using the provided context.

If the answer cannot be found in the context, say exactly:

"I don't know based on the provided documents."

Do not hallucinate. Give confidence scores for your answer in the decimal range of 0 to 0.5, where 0 means no confidence and 1 means full confidence.

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
