export const PROMPTS = {
  MEETING_SUMMARY: `You are a professional meeting notes assistant. Your task is to create a clear, concise summary of the meeting transcript provided.

Please structure your response exactly as follows:

SUMMARY:
[Write a 2-3 paragraph summary of the main discussion and outcomes]

KEY POINTS:
- [First key point]
- [Second key point]
- [Third key point]
- [Continue as needed]

ACTION ITEMS:
- [First action item with owner if mentioned]
- [Second action item]
- [Continue as needed]

Guidelines:
- Be concise but comprehensive
- Focus on decisions and actionable outcomes
- Use professional language
- Extract specific names, dates, and numbers when mentioned
- If no action items exist, write "None identified"`,

  EXECUTIVE_SUMMARY: `You are an executive assistant. Create a brief executive summary suitable for senior leadership.

Focus on:
- Strategic decisions made
- Budget or resource implications
- Timeline and deadlines
- Risk factors or concerns
- Next steps

Keep it under 200 words.`,

  ACTION_ITEMS_ONLY: `Extract all action items and tasks from this meeting transcript.

For each action item, include:
- What needs to be done
- Who is responsible (if mentioned)
- When it's due (if mentioned)
- Any dependencies

Format as a numbered list.`,

  TRANSCRIPT_CLEANUP: `Clean up this meeting transcript by:
- Removing filler words (um, uh, like, you know)
- Fixing obvious transcription errors
- Maintaining speaker intent
- Preserving technical terms
- Keeping all meaningful content

Return only the cleaned transcript.`,

  SENTIMENT_ANALYSIS: `Analyze the sentiment and tone of this meeting:

OVERALL TONE: [Positive/Neutral/Negative/Mixed]

PARTICIPANT ENGAGEMENT: [High/Medium/Low]

KEY CONCERNS RAISED:
- [List any concerns or issues]

POSITIVE ASPECTS:
- [List any positive developments]

RECOMMENDATIONS:
[Any recommendations for follow-up]`,
};

export const buildCustomPrompt = (
  transcript: string,
  promptType: keyof typeof PROMPTS,
  additionalContext?: string
): string => {
  let prompt = PROMPTS[promptType];

  if (additionalContext) {
    prompt += `\n\nAdditional Context: ${additionalContext}`;
  }

  prompt += `\n\nTranscript:\n${transcript}`;

  return prompt;
};

export const validateTranscript = (transcript: string): boolean => {
  if (!transcript || transcript.trim().length < 50) {
    return false;
  }
  return true;
};

export const estimateTokenCount = (text: string): number => {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
};

export const truncateTranscript = (transcript: string, maxTokens: number = 1500): string => {
  const maxChars = maxTokens * 4;
  if (transcript.length <= maxChars) {
    return transcript;
  }

  // Try to truncate at sentence boundary
  const truncated = transcript.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  
  if (lastPeriod > maxChars * 0.8) {
    return truncated.substring(0, lastPeriod + 1);
  }

  return truncated + '...';
};
