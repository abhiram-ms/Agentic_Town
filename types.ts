
export enum TimeOfDay {
  MORNING = 'Morning',
  EVENING = 'Evening',
  NIGHT = 'Night'
}

export interface NPCData {
  id: string;
  name: string;
  mood: string;
  personality: string;
  currentThought: string;
  memory: string[];
  color: number;
  interactingWith?: string | 'player' | null;
  lastInteractionTime?: number;
  destination?: { x: number, y: number } | null;
  targetLocationName?: string | null;
  currentAction?: string | null;
  homeLocation: { x: number, y: number };
}

export interface ChatMessage {
  id: string;
  npcId: string;
  npcName: string;
  text: string;
  timestamp: number;
  type: 'thought' | 'interaction' | 'player' | 'system';
}

export interface GameState {
  worldTime: number;
  timeOfDay: TimeOfDay;
  selectedNPCId: string | null;
  level: number;
  score: number;
}
