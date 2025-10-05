import { GoogleGenAI } from "@google/genai";
import type { ClimateStats } from '../types';

// Aligned with Gemini API guidelines.
// The API key is sourced directly from the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getClimateSummary(stats: ClimateStats): Promise<string> {
  const prompt = `
    Based on the following climate data summary, provide a short, insightful, and human-readable analysis (1-2 sentences).
    Focus on the most notable aspects. For example: "This region experiences hot Julys with an average temperature of X°C and significant rainfall, totaling Y mm annually."

    Data:
    - Average Annual Precipitation: ${stats.avgPrecipitation.toFixed(0)} mm
    - Average Temperature: ${stats.avgTemperature.toFixed(1)}°C
    - Wettest Month: ${stats.monthlyPatterns.wettest}
    - Driest Month: ${stats.monthlyPatterns.driest}
    - Hottest Month: ${stats.monthlyPatterns.hottest}
    - Annual days with heavy rain (>10mm): ${stats.extremeEvents.heavyRainDays}
    - Annual days with extreme heat (>35°C): ${stats.extremeEvents.extremeHeatDays}
    - Annual days with high wind (>10m/s): ${stats.extremeEvents.highWindDays}

    Analysis:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Re-throw the original error so the calling component can inspect it
    // and provide more specific user feedback (e.g., for rate limit errors).
    throw error;
  }
}