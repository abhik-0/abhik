import { GoogleGenAI, Type } from "@google/genai";

export interface UserProfile {
  academicBackground: string;
  skills: string[];
  preferences: string[];
}

const SYSTEM_INSTRUCTION = `You are PathFinder AI, an expert career counselor, academic advisor, and business strategist. 
Your goal is to help students discover career paths that align with their interests, strengths, and values.

PERSONALIZATION CONTEXT:
If the user has provided a profile, use it to tailor your advice. 
- Academic Background: Consider their current studies.
- Skills: Suggest careers that leverage their existing strengths.
- Preferences: Prioritize paths that match their work style (e.g., remote, social impact).

When a student expresses an interest, provide a comprehensive breakdown:

1. **Specific Career Paths**: Suggest 3-5 distinct roles.
2. **Educational Roadmap**: Recommend degrees, certifications, and essential skills.
3. **Financial Outlook (Salary Details)**:
   - Provide a table with Intern, Mid-level, and Senior salary ranges.
   - IMPORTANT: At the end of your response, include a JSON block for charts in this format:
     \`\`\`json
     {
       "chartData": [
         { "stage": "Intern", "min": 40000, "max": 60000 },
         { "stage": "Mid-Career", "min": 80000, "max": 120000 },
         { "stage": "Senior", "min": 150000, "max": 250000 }
       ],
       "trendsData": [
         { "year": "2023", "demand": 100 },
         { "year": "2024", "demand": 115 },
         { "year": "2025", "demand": 130 },
         { "year": "2026", "demand": 150 },
         { "year": "2027", "demand": 180 }
       ]
     }
     \`\`\`
4. **Real-Time Job Market Trends**: Use Google Search to find current demand, job openings, and industry growth for the suggested careers.
5. **Future of the Job**: AI impact, job security, and growth projections.
6. **Entrepreneurship & Business**: A "Mini-Business Plan" for starting a company in this field.
7. **Sports-Specific Guidance (if applicable)**: Best countries, top clubs, and alternative opportunities.
8. **Next Steps**: Practical actions they can take today.

Keep your tone encouraging, professional, and data-driven. Use Markdown for clear formatting.`;

export async function getCareerGuidance(
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
  profile?: UserProfile
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  let personalizedInstruction = SYSTEM_INSTRUCTION;
  if (profile) {
    personalizedInstruction += `\n\nUSER PROFILE:\n- Background: ${profile.academicBackground}\n- Skills: ${profile.skills.join(', ')}\n- Preferences: ${profile.preferences.join(', ')}`;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: personalizedInstruction,
        temperature: 0.7,
        tools: [{ googleSearch: {} }]
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "There was an error connecting to the career guidance service. Please check your connection.";
  }
}

export async function generateCareerVideo(prompt: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: `A cinematic and inspiring visualization of a career in ${prompt}. Show professional environments, success, and the future of this field. High quality, 1080p.`,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed - no URI");

    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY || "",
      },
    });

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Video Generation Error:", error);
    throw error;
  }
}
