import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

function getAiInstance(customApiKey?: string) {
  const key = customApiKey || process.env.API_KEY || '';
  if (key && key !== 'your_gemini_api_key_here') {
    return new GoogleGenAI({ apiKey: key });
  }
  return null;
}

export async function analyzeLeadInquiry(
  data: { name: string; destination: string; duration: number; date: string; travelers: any; otherInfo: string },
  customApiKey?: string
) {
  const ai = getAiInstance(customApiKey);
  if (ai) {
    try {
      const prompt = `Analyze this structured travel inquiry for Kingsland Holidays:\n  Name: ${data.name}\n  Destination: ${data.destination}\n  Duration: ${data.duration} days\n  Date of Travel: ${data.date}\n  Travelers: ${data.travelers.adults} Adults, ${data.travelers.children} Children (Ages: ${(data.travelers.childAges || []).join(', ')})\n  Other Requirements: ${data.otherInfo}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              intent: { type: Type.STRING, enum: ['High Intent', 'Information Seeking', 'Urgent'] },
              summary: { type: Type.STRING },
              budgetTier: { type: Type.STRING, enum: ['Luxury', 'Mid', 'Budget'] },
              preferences: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['score', 'intent', 'summary', 'budgetTier', 'preferences']
          }
        },
      });
      return JSON.parse(response.text || '{}');
    } catch (err) {
      console.warn('⚠️ Gemini AI call failed, using fallback analysis:', err);
    }
  }

  // Fallback
  return {
    score: 85,
    intent: 'High Intent',
    summary: `${data.duration}-day trip to ${data.destination} for ${data.travelers?.adults || 2} Adults${data.travelers?.children ? `, ${data.travelers.children} Children` : ''}.`,
    budgetTier: 'Mid',
    preferences: ['Sightseeing', 'Comfort Stay', 'Private Transfer']
  };
}

export async function generateItinerary(
  data: { name: string; destination: string; durationDays: number; travelDate: string; adults: number; children: number; summary: string; otherInfo: string },
  customApiKey?: string
) {
  const ai = getAiInstance(customApiKey);
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: `Build a hyper-personalized ${data.durationDays}-day itinerary for ${data.name} starting on ${data.travelDate} in ${data.destination}. Travelers: ${data.adults} Adults, ${data.children} Children. Context: ${data.summary}. Other Info: ${data.otherInfo}. Brand Voice: Kingsland Holidays.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.NUMBER },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    activities: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['day', 'title', 'description', 'activities']
                }
              },
              totalPrice: { type: Type.NUMBER },
              bestValueWindow: { type: Type.STRING }
            },
            required: ['title', 'days', 'totalPrice', 'bestValueWindow']
          }
        },
      });
      return JSON.parse(response.text || '{}');
    } catch (err) {
      console.warn('⚠️ Gemini AI call failed, using fallback itinerary:', err);
    }
  }

  // Fallback itinerary generator
  const numDays = data.durationDays || 5;
  const days = [];
  for (let i = 1; i <= numDays; i++) {
    if (i === 1) {
      days.push({ day: 1, title: `Arrival in ${data.destination}`, description: `Welcome to ${data.destination}! Private airport transfer to hotel and evening leisure time.`, activities: ['Airport Pickup', 'Hotel Check-in', 'Welcome Dinner'] });
    } else if (i === numDays) {
      days.push({ day: numDays, title: 'Departure Day', description: `Breakfast at hotel, souvenir shopping, and private transfer to airport for departure.`, activities: ['Breakfast', 'Hotel Check-out', 'Airport Transfer'] });
    } else {
      days.push({ day: i, title: `${data.destination} Highlights - Day ${i}`, description: `Full day guided tour covering iconic sights, local culture, and dining in ${data.destination}.`, activities: ['Sightseeing Tour', 'Local Lunch', 'Cultural Experience'] });
    }
  }

  return {
    title: `${data.destination} Experience (${numDays} Days)`,
    days,
    totalPrice: 45000,
    bestValueWindow: 'September - November'
  };
}

export async function draftFollowUpEmail(
  data: { leadName: string; agentName: string; destination: string; travelDate: string; status: string; otherInfo: string },
  customApiKey?: string
) {
  const ai = getAiInstance(customApiKey);
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: `Draft a professional sales follow-up email from travel advisor ${data.agentName} to customer ${data.leadName} regarding their upcoming trip to ${data.destination} on ${data.travelDate}. Current status: ${data.status}. Extra info: ${data.otherInfo}.`,
      });
      return { email: response.text || '' };
    } catch (err) {
      console.warn('⚠️ Gemini AI draft email failed, using fallback:', err);
    }
  }

  return {
    email: `Hi ${data.leadName},\n\nHope you are doing well!\n\nI wanted to check in regarding your upcoming trip to ${data.destination}. We have prepared a customized itinerary for you with special rates.\n\nPlease let me know a convenient time to connect.\n\nWarm regards,\n${data.agentName}\nKingsland Holidays`
  };
}
