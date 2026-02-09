
import { GoogleGenAI, Type } from "@google/genai";
import { NPCData, TimeOfDay } from "../types";

export class CognitionEngine {
  private ai: GoogleGenAI;
  private isFallbackActive: boolean = false;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private handleRateLimit() {
    this.isFallbackActive = true;
    setTimeout(() => { this.isFallbackActive = false; }, 60000);
  }

  async processNPCCognition(npc: NPCData, timeOfDay: TimeOfDay, playerProximity: boolean): Promise<{ thought: string, mood: string, memoryAddition: string }> {
    try {
      const prompt = `You are ${npc.name}, a ${npc.personality} in a 2D town. 
        Mood: ${npc.mood}, Time: ${timeOfDay}. 
        Buildings in town: Coffee Shop, Market, Library, School, Corporate Co.
        Generate a short internal thought (max 10 words) and a new mood.
        Return JSON {thought, mood, memoryAddition}.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thought: { type: Type.STRING },
              mood: { type: Type.STRING },
              memoryAddition: { type: Type.STRING }
            },
            required: ["thought", "mood"]
          }
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      return { thought: result.thought || "...", mood: result.mood || npc.mood, memoryAddition: result.memoryAddition || "" };
    } catch (error: any) {
      if (error?.message?.includes('429')) this.handleRateLimit();
      return { thought: "Just wandering...", mood: npc.mood, memoryAddition: "" };
    }
  }

  async respondToPlayer(npc: NPCData, playerMessage: string, timeOfDay: TimeOfDay): Promise<{ response: string, newMood: string, intent: string | null, targetLocation: string | null }> {
    try {
      const prompt = `You are ${npc.name} (${npc.personality}). Player said: "${playerMessage}". 
        Current Mood: ${npc.mood}. 
        Locations: Coffee Shop, Market, Library, School, Corporate Co.
        If the player convinces you to go somewhere or do a task, set 'intent' to 'moving' and specify the 'targetLocation'.
        Return JSON {response, newMood, intent, targetLocation}.`;

      const result = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: { type: Type.STRING },
              newMood: { type: Type.STRING },
              intent: { type: Type.STRING, nullable: true },
              targetLocation: { type: Type.STRING, nullable: true }
            },
            required: ["response", "newMood"]
          }
        }
      });

      const data = JSON.parse(result.text || "{}");
      return { 
        response: data.response || "...", 
        newMood: data.newMood || npc.mood, 
        intent: data.intent || null,
        targetLocation: data.targetLocation || null
      };
    } catch (error: any) {
      if (error?.message?.includes('429')) this.handleRateLimit();
      return { response: "I'm busy right now.", newMood: npc.mood, intent: null, targetLocation: null };
    }
  }

  async processNPCtoNPCInteraction(initiator: NPCData, responder: NPCData): Promise<{ initiatorResponse: string, responderResponse: string, finalMoods: { [key: string]: string }, intent?: string | null, targetLocation?: string | null }> {
    try {
      const prompt = `Two NPCs are interacting. 
        Initiator: ${initiator.name}, Responder: ${responder.name}. 
        They might discuss going to a location together (Coffee Shop, Market, etc).
        Return JSON {initiatorResponse, responderResponse, initiatorNewMood, responderNewMood, sharedIntent, sharedTargetLocation}.`;

      const result = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              initiatorResponse: { type: Type.STRING },
              responderResponse: { type: Type.STRING },
              initiatorNewMood: { type: Type.STRING },
              responderNewMood: { type: Type.STRING },
              sharedIntent: { type: Type.STRING, nullable: true },
              sharedTargetLocation: { type: Type.STRING, nullable: true }
            },
            required: ["initiatorResponse", "responderResponse", "initiatorNewMood", "responderNewMood"]
          }
        }
      });

      const data = JSON.parse(result.text || "{}");
      return {
        initiatorResponse: data.initiatorResponse,
        responderResponse: data.responderResponse,
        finalMoods: { [initiator.id]: data.initiatorNewMood, [responder.id]: data.responderNewMood },
        intent: data.sharedIntent,
        targetLocation: data.sharedTargetLocation
      };
    } catch (error) {
      return { initiatorResponse: "Hey.", responderResponse: "Hello.", finalMoods: {} };
    }
  }
}

export const cognitionEngine = new CognitionEngine();
