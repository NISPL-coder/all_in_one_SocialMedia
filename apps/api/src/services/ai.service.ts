import axios from 'axios';
import { AICaptionRequest, AICaptionResponse } from '@socialhub/shared';
import { ENV } from '../config/env';

export class AIService {
  async generateCaptions(request: AICaptionRequest): Promise<AICaptionResponse> {
    const { prompt, tone = 'engaging', includeHashtags = true, includeEmojis = true } = request;

    // If Gemini API Key is configured, use Google Generative Language API
    if (ENV.AI_API_KEY && ENV.AI_PROVIDER === 'gemini') {
      try {
        const systemPrompt = `You are an expert social media strategist and copywriter.
Based on the user topic: "${prompt}" and tone "${tone}".
Generate:
1. A master engaging caption (emojis: ${includeEmojis ? 'yes' : 'no'}).
2. 5-8 relevant hashtags.
3. Tailored variations for LinkedIn (thought-leadership, professional), Facebook (friendly, conversational), Instagram (aesthetic, hooks, hashtags), WhatsApp (direct, clear call to action), and Google Business Profile (concise, local business update).
4. 3 alternative catchy headline hooks.
Return ONLY valid JSON matching this schema:
{
  "caption": "string",
  "hashtags": ["string"],
  "platformVariations": {
    "LINKEDIN": "string",
    "FACEBOOK": "string",
    "INSTAGRAM": "string",
    "WHATSAPP": "string",
    "GOOGLE_BUSINESS": "string"
  },
  "headlineSuggestions": ["string"]
}`;

        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ENV.AI_API_KEY}`,
          {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }
        );

        const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          return JSON.parse(rawText);
        }
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to smart copywriter engine:', err.message);
      }
    }

    // High quality intelligent copywriting generator for instant local usage
    return this.generateSmartMock(prompt, tone, includeHashtags, includeEmojis);
  }

  private generateSmartMock(
    prompt: string,
    tone: string,
    includeHashtags: boolean,
    includeEmojis: boolean
  ): AICaptionResponse {
    const emojis = includeEmojis ? ['🚀', '✨', '💡', '📈', '🔥', '🎯'] : ['', '', '', '', '', ''];
    const cleanPrompt = prompt.trim();

    const sampleHashtags = [
      '#Innovation',
      '#TechUpdates',
      '#BusinessGrowth',
      '#DigitalTransformation',
      '#MarketingStrategy',
      '#Leadership',
    ];

    const masterCaption = `${emojis[0]} Exciting news! ${cleanPrompt}. We are passionate about driving impact, streamlining modern workflows, and delivering exceptional value every single day.\n\nWhat are your thoughts on this? Let us know in the comments below! ${emojis[1]}`;

    return {
      caption: masterCaption,
      hashtags: includeHashtags ? sampleHashtags : [],
      platformVariations: {
        LINKEDIN: `In today's fast-evolving landscape, adaptability and execution define success.\n\nRegarding ${cleanPrompt}: organizations that actively embrace agility and customer-centric problem solving consistently outperform the competition.\n\nHere are three key principles we focus on:\n1. Purpose-driven clarity\n2. Measurable execution\n3. Continuous innovation\n\nHow is your organization approaching this transition this quarter? Join the discussion below.`,
        FACEBOOK: `Hey everyone! 👋 Big updates to share with our community today!\n\n${cleanPrompt} 🙌\n\nWe couldn't have achieved this milestone without your continuous support. Click the link in the comments to explore the full story, or drop a ❤️ if you're as excited as we are!`,
        INSTAGRAM: `Big milestones start with bold ideas. ✨\n\n${cleanPrompt}\n\nSave this post for later and share it with someone who needs to see this! 📌 Tap the link in our bio to learn more.\n\n${sampleHashtags.join(' ')}`,
        WHATSAPP: `Hello! 📢 Quick update from TechVision:\n\n${cleanPrompt}\n\nFor more details or to schedule a priority consultation, reply directly to this message or visit our official portal. Have a great day!`,
        GOOGLE_BUSINESS: `Special Update: ${cleanPrompt}. Visit our location or check our official website for full operating hours, consultations, and the latest releases.`,
      },
      headlineSuggestions: [
        `Transforming the Future: ${cleanPrompt.slice(0, 45)}...`,
        `Why Everyone Is Talking About ${cleanPrompt.slice(0, 40)}`,
        `Behind the Scenes: How We Approach ${cleanPrompt.slice(0, 35)}`,
      ],
    };
  }
}

export const aiService = new AIService();
