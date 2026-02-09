
import { NPCData } from './types';

export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const TIME_CYCLE_SECONDS = 180; // 3 minutes for a full day cycle

export const BUILDINGS = {
  COFFEE_SHOP: { x: 100, y: 100, name: 'Coffee Shop', color: 0x78350f },
  MARKET: { x: WORLD_WIDTH - 150, y: 120, name: 'Market', color: 0x15803d },
  LIBRARY: { x: 120, y: WORLD_HEIGHT - 150, name: 'Library', color: 0x1e40af },
  SCHOOL: { x: WORLD_WIDTH - 150, y: WORLD_HEIGHT - 150, name: 'School', color: 0xa21caf },
  COMPANY: { x: WORLD_WIDTH / 2 - 50, y: 60, name: 'Corporate Co.', color: 0x334155 }
};

export const INITIAL_NPCS: NPCData[] = [
  {
    id: 'ravi',
    name: 'Ravi',
    mood: 'anxious',
    personality: 'overthinker',
    currentThought: 'Is someone watching me?',
    memory: ['Felt ignored earlier', 'The air feels heavy today'],
    color: 0x3b82f6,
    homeLocation: { x: 50, y: 300 }
  },
  {
    id: 'anya',
    name: 'Anya',
    mood: 'hopeful',
    personality: 'social',
    currentThought: 'I wonder who I will meet today!',
    memory: ['Had a great dream about a city in the clouds'],
    color: 0xec4899,
    homeLocation: { x: 400, y: 550 }
  },
  {
    id: 'kiran',
    name: 'Kiran',
    mood: 'angry',
    personality: 'loner',
    currentThought: 'Everyone is so loud...',
    memory: ['Someone stepped on my shadow', 'The morning sun was too bright'],
    color: 0xef4444,
    homeLocation: { x: 750, y: 300 }
  }
];
