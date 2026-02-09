
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { MainScene } from './game/AgenticTown';
import { NPCData, TimeOfDay, ChatMessage } from './types';
import { WORLD_WIDTH, WORLD_HEIGHT, INITIAL_NPCS, BUILDINGS } from './constants';
import HUD from './components/HUD';
import NPCInspector from './components/NPCInspector';
import ChatWindow from './components/ChatWindow';
import { cognitionEngine } from './services/geminiService';

const App: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MainScene | null>(null);
  const [worldTime, setWorldTime] = useState(8);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(TimeOfDay.MORNING);
  const [selectedNPCId, setSelectedNPCId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [npcs, setNpcs] = useState<NPCData[]>(() => JSON.parse(JSON.stringify(INITIAL_NPCS)));
  const [level, setLevel] = useState(1);
  const [victory, setVictory] = useState(false);

  const selectedNPC = npcs.find(n => n.id === selectedNPCId) || null;

  const addChatMessage = useCallback((npcId: string, text: string, type: ChatMessage['type'], npcName?: string) => {
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      npcId,
      npcName: npcName || 'System',
      text,
      timestamp: Date.now(),
      type
    };
    setChatHistory(prev => [...prev, newMessage].slice(-50));
  }, []);

  // Ensure Phaser knows about current NPC states (destinations, intents)
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.syncNPCs(npcs);
    }
  }, [npcs]);

  const checkVictory = useCallback((npcStatus: NPCData[]) => {
    if (level === 1) {
      const atCoffee = npcStatus.filter(n => n.currentAction === 'at_coffee_shop').length;
      if (atCoffee >= 3) {
        setVictory(true);
      }
    } else if (level === 2) {
      const anya = npcStatus.find(n => n.id === 'anya');
      const kiran = npcStatus.find(n => n.id === 'kiran');
      if (anya?.currentAction === 'at_market' && kiran?.currentAction === 'at_market') {
        setVictory(true);
      }
    }
  }, [level]);

  const handleNPCReachedLocation = useCallback((npcId: string, locationName: string) => {
    setNpcs(prev => {
      const next = prev.map(n => {
        if (n.id === npcId) {
          const action = `at_${locationName.toLowerCase().replace(' ', '_')}`;
          return { ...n, currentAction: action, destination: null, targetLocationName: null };
        }
        return n;
      });
      
      const arrivingNPC = next.find(n => n.id === npcId);
      if (arrivingNPC) {
        addChatMessage('system', `${arrivingNPC.name} has arrived at the ${locationName}!`, 'system', 'System');
      }

      // Check for victory condition on state change
      setTimeout(() => checkVictory(next), 0);
      return next;
    });
  }, [addChatMessage, checkVictory]);

  const handleNPCApproach = useCallback((npc: NPCData) => {
    setSelectedNPCId(npc.id);
    setNpcs(prev => prev.map(n => n.id === npc.id ? { ...n, interactingWith: 'player' } : n));
  }, []);

  const handleNPCtoNPCInteraction = useCallback(async (npcA: NPCData, npcB: NPCData) => {
    try {
      const interaction = await cognitionEngine.processNPCtoNPCInteraction(npcA, npcB);
      addChatMessage(npcB.id, interaction.responderResponse, 'interaction', npcB.name);
      addChatMessage(npcA.id, interaction.initiatorResponse, 'interaction', npcA.name);

      if (interaction.intent === 'moving' && interaction.targetLocation) {
        const loc = Object.values(BUILDINGS).find(b => b.name.toLowerCase().includes(interaction.targetLocation!.toLowerCase()));
        if (loc) {
          setNpcs(prev => prev.map(n => {
            if (n.id === npcA.id || n.id === npcB.id) {
               return { ...n, destination: { x: loc.x, y: loc.y }, targetLocationName: loc.name, currentAction: 'moving' };
            }
            return n;
          }));
          addChatMessage('system', `${npcA.name} and ${npcB.name} are heading to ${loc.name}.`, 'system', 'Town Event');
        }
      }

      sceneRef.current?.setInteractionCooldown(npcA.id, 25000);
      sceneRef.current?.setInteractionCooldown(npcB.id, 25000);
      
      setNpcs(prev => prev.map(n => {
        if (n.id === npcA.id || n.id === npcB.id) {
          return { ...n, interactingWith: null };
        }
        return n;
      }));
    } catch (err) {
      setNpcs(prev => prev.map(n => {
        if (n.id === npcA.id || n.id === npcB.id) {
          return { ...n, interactingWith: null };
        }
        return n;
      }));
    }
  }, [addChatMessage]);

  useEffect(() => {
    if (!gameRef.current) return;

    const mainScene = new MainScene({
      onTimeUpdate: (time: number, period: TimeOfDay) => {
        setWorldTime(time);
        setTimeOfDay(period);
      },
      onNPCSelected: (npc: NPCData | null) => setSelectedNPCId(npc?.id || null),
      onNPCThought: (npcId: string, thought: string, type: 'thought' | 'interaction') => {
        setNpcs(prev => {
          const npc = prev.find(n => n.id === npcId);
          if (npc) addChatMessage(npcId, thought, type, npc.name);
          return prev;
        });
      },
      onNPCApproach: handleNPCApproach,
      onNPCtoNPCInteraction: handleNPCtoNPCInteraction,
      onNPCReachedLocation: handleNPCReachedLocation
    });

    sceneRef.current = mainScene;
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      backgroundColor: '#1e293b',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene: mainScene
    };

    const game = new Phaser.Game(config);
    return () => game.destroy(true);
  }, []); // Mount once

  const handleSendMessage = async (message: string) => {
    if (!selectedNPCId || isThinking) return;
    const currentNPC = npcs.find(n => n.id === selectedNPCId);
    if (!currentNPC) return;

    setIsThinking(true);
    addChatMessage('player', message, 'player', 'You');

    try {
      const { response, newMood, intent, targetLocation } = await cognitionEngine.respondToPlayer(currentNPC, message, timeOfDay);
      
      let dest = null;
      let locName = null;
      if (intent === 'moving' && targetLocation) {
        const found = Object.values(BUILDINGS).find(b => b.name.toLowerCase().includes(targetLocation.toLowerCase()));
        if (found) {
            dest = { x: found.x, y: found.y };
            locName = found.name;
            addChatMessage('system', `${currentNPC.name} is now moving to the ${found.name}.`, 'system', 'System');
        }
      }

      setNpcs(prev => prev.map(n => n.id === selectedNPCId ? { 
        ...n, 
        mood: newMood, 
        currentThought: response,
        destination: dest,
        targetLocationName: locName,
        interactingWith: null,
        currentAction: dest ? 'moving' : n.currentAction
      } : n));
      
      sceneRef.current?.updateNPCBubble(currentNPC.id, response);
      addChatMessage(currentNPC.id, response, 'interaction', currentNPC.name);
    } catch (error) {
      addChatMessage('system', "Connection error.", 'system', 'System');
    } finally {
      setIsThinking(false);
    }
  };

  const nextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setVictory(false);
    const resetNpcs = JSON.parse(JSON.stringify(INITIAL_NPCS)).map((n: NPCData) => ({ ...n, currentAction: null, destination: null }));
    setNpcs(resetNpcs);
    addChatMessage('system', `Level ${nextLvl} Started!`, 'system', 'System');
  };

  const level1Progress = npcs.filter(n => n.currentAction === 'at_coffee_shop').length;
  const level2Progress = [npcs.find(n => n.id === 'anya'), npcs.find(n => n.id === 'kiran')].filter(n => n?.currentAction === 'at_market').length;

  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="relative z-10 shadow-2xl rounded-xl overflow-hidden border-4 border-slate-800 bg-slate-900">
          <div ref={gameRef} />
          <HUD worldTime={worldTime} timeOfDay={timeOfDay} />
          
          <div className="absolute top-4 right-4 bg-slate-900/90 p-4 rounded-xl border border-sky-500/30 backdrop-blur-md shadow-2xl min-w-[220px]">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-sky-400 font-black text-xl tracking-tighter">LEVEL {level}</h2>
                <span className="text-[10px] bg-sky-900/50 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/20">PROGRESS</span>
            </div>
            
            <p className="text-xs text-slate-300 mb-3 font-medium">
                {level === 1 ? "Convince all 3 NPCs to meet at the Coffee Shop." : "Convince Anya and Kiran to meet at the Market for their date."}
            </p>

            <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Task Completion</span>
                    <span className="text-sky-400 font-mono">{level === 1 ? `${level1Progress}/3` : `${level2Progress}/2`}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="h-full bg-sky-500 transition-all duration-700 ease-out"
                        style={{ width: `${(level === 1 ? level1Progress / 3 : level2Progress / 2) * 100}%` }}
                    />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                    {npcs.map(n => {
                        const isActive = level === 1 ? n.currentAction === 'at_coffee_shop' : (['anya', 'kiran'].includes(n.id) && n.currentAction === 'at_market');
                        const isRequired = level === 1 || ['anya', 'kiran'].includes(n.id);
                        if (!isRequired) return null;

                        return (
                          <div key={n.id} className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${isActive ? 'bg-green-500/20 border-green-500/50 text-green-400 font-bold' : n.currentAction === 'moving' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                              {n.name}: {n.currentAction?.replace('at_', '').replace('_', ' ') || 'idle'}
                          </div>
                        );
                    })}
                </div>
            </div>
          </div>

          {victory && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
              <div className="text-center p-12 border-4 border-sky-500 rounded-[3rem] bg-slate-900 shadow-[0_0_80px_rgba(14,165,233,0.4)] relative overflow-hidden">
                <h1 className="text-7xl font-black text-white mb-2 tracking-tighter italic">LEVEL UP!</h1>
                <h2 className="text-2xl font-bold text-sky-400 mb-10 uppercase tracking-widest">Master of Persuasion</h2>
                <button 
                  onClick={nextLevel}
                  className="px-12 py-5 bg-white text-slate-950 font-black rounded-2xl text-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-[400px] border-l border-slate-800 bg-slate-900/50 backdrop-blur-md flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
          <h1 className="text-xl font-bold text-sky-400 tracking-tight">Agentic Town</h1>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <ChatWindow messages={chatHistory} selectedNPC={selectedNPC} onSendMessage={handleSendMessage} isThinking={isThinking} />
        </div>
        {selectedNPC && (
          <div className="border-t border-slate-800">
             <NPCInspector npc={selectedNPC} onClose={() => setSelectedNPCId(null)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
