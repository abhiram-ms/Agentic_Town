
import Phaser from 'phaser';
import { INITIAL_NPCS, WORLD_WIDTH, WORLD_HEIGHT, TIME_CYCLE_SECONDS, BUILDINGS } from '../constants';
import { NPCData, TimeOfDay } from '../types';
import { cognitionEngine } from '../services/geminiService';

export class MainScene extends Phaser.Scene {
  public add!: Phaser.GameObjects.GameObjectFactory;
  public physics!: Phaser.Physics.Arcade.ArcadePhysics;
  public input!: Phaser.Input.InputPlugin;
  public time!: Phaser.Time.Clock;
  public tweens!: Phaser.Tweens.TweenManager;
  public cameras!: Phaser.Cameras.Scene2D.CameraManager;

  private player!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private npcs: Map<string, Phaser.GameObjects.Container> = new Map();
  private idleTweens: Map<string, Phaser.Tweens.Tween[]> = new Map();
  private npcData: NPCData[] = JSON.parse(JSON.stringify(INITIAL_NPCS));
  private worldTime: number = 8;
  private proximityState: Map<string, boolean> = new Map();
  private interactionCooldowns: Map<string, number> = new Map();
  private lastPeriod: TimeOfDay = TimeOfDay.MORNING;
  
  private onTimeUpdate: (time: number, period: TimeOfDay) => void;
  private onNPCSelected: (npc: NPCData | null) => void;
  private onNPCThought: (npcId: string, thought: string, type: 'thought' | 'interaction') => void;
  private onNPCApproach: (npc: NPCData) => void;
  private onNPCtoNPCInteraction: (npcA: NPCData, npcB: NPCData) => void;
  private onNPCReachedLocation: (npcId: string, locationName: string) => void;

  constructor(callbacks: { 
    onTimeUpdate: any, 
    onNPCSelected: any, 
    onNPCThought: any,
    onNPCApproach: any,
    onNPCtoNPCInteraction: any,
    onNPCReachedLocation: any
  }) {
    super('MainScene');
    this.onTimeUpdate = callbacks.onTimeUpdate;
    this.onNPCSelected = callbacks.onNPCSelected;
    this.onNPCThought = callbacks.onNPCThought;
    this.onNPCApproach = callbacks.onNPCApproach;
    this.onNPCtoNPCInteraction = callbacks.onNPCtoNPCInteraction;
    this.onNPCReachedLocation = callbacks.onNPCReachedLocation;
  }

  preload() {}

  create() {
    this.drawTownBackground();
    this.createHumanTextures();

    // Create Player
    this.player = this.createCharacter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 0xffffff, "You");
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    this.npcData.forEach((data) => {
      this.createNPC(data);
      this.proximityState.set(data.id, false);
      this.interactionCooldowns.set(data.id, 0);
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.removeCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.time.addEvent({
      delay: (TIME_CYCLE_SECONDS * 1000) / 24,
      callback: this.incrementTime,
      callbackScope: this,
      loop: true
    });

    this.time.addEvent({
      delay: 30000,
      callback: this.triggerAIThoughts,
      callbackScope: this,
      loop: true
    });
  }

  private getMoodColor(mood: string): number {
    const m = mood.toLowerCase();
    if (m.includes('happy') || m.includes('joy') || m.includes('excited')) return 0x22c55e;
    if (m.includes('angry') || m.includes('mad') || m.includes('frust')) return 0xef4444;
    if (m.includes('anxious') || m.includes('nervous') || m.includes('worr')) return 0xeab308;
    if (m.includes('sad') || m.includes('lonely') || m.includes('blue')) return 0x3b82f6;
    if (m.includes('hopeful') || m.includes('social')) return 0xec4899;
    if (m.includes('relaxed') || m.includes('calm')) return 0x06b6d4;
    return 0x94a3b8; // neutral
  }

  public syncNPCs(updatedNPCs: NPCData[]) {
    updatedNPCs.forEach(updated => {
      const internal = this.npcData.find(n => n.id === updated.id);
      if (internal) {
        internal.destination = updated.destination;
        internal.targetLocationName = updated.targetLocationName;
        internal.interactingWith = updated.interactingWith;
        internal.currentAction = updated.currentAction;
        internal.mood = updated.mood;
        internal.currentThought = updated.currentThought;

        const container = this.npcs.get(updated.id);
        if (container) {
          const halo = container.getAt(6) as Phaser.GameObjects.Graphics;
          halo.clear();
          halo.lineStyle(2, this.getMoodColor(updated.mood), 0.6);
          halo.strokeEllipse(0, -26, 12, 4);
        }
      }
    });
  }

  private drawTownBackground() {
    const bg = this.add.graphics();
    bg.fillStyle(0x2d5a27, 1); bg.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    bg.fillStyle(0x475569, 1);
    bg.fillRect(WORLD_WIDTH / 2 - 20, 0, 40, WORLD_HEIGHT);
    bg.fillRect(0, WORLD_HEIGHT / 2 - 20, WORLD_WIDTH, 40);

    Object.values(BUILDINGS).forEach(b => {
      bg.fillStyle(b.color, 1);
      bg.fillRect(b.x - 40, b.y - 40, 80, 80);
      bg.lineStyle(3, 0xffffff, 0.4);
      bg.strokeRect(b.x - 40, b.y - 40, 80, 80);
      this.add.text(b.x, b.y + 55, b.name, {
        fontSize: '11px', color: '#fff', fontStyle: 'bold', backgroundColor: '#000000bb', padding: { x: 5, y: 3 }
      }).setOrigin(0.5);
    });
  }

  private createHumanTextures() {
    const g = this.add.graphics();
    g.fillStyle(0xffdbac, 1); g.fillCircle(8, 8, 8); g.generateTexture('human_head', 16, 16);
    g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 16, 20); g.generateTexture('human_torso', 16, 20);
    g.destroy();
  }

  private createCharacter(x: number, y: number, color: number, name: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const torso = this.add.image(0, 0, 'human_torso').setTint(color);
    const head = this.add.image(0, -14, 'human_head');
    const leftLeg = this.add.rectangle(-4, 12, 4, 10, 0x1e293b);
    const rightLeg = this.add.rectangle(4, 12, 4, 10, 0x1e293b);
    const label = this.add.text(0, -38, name, { fontSize: '11px', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
    
    const thoughtBubble = this.add.text(0, -75, '', { 
      fontSize: '10px', 
      color: '#0f172a', 
      backgroundColor: '#ffffff', 
      padding: { x: 10, y: 8 }, 
      wordWrap: { width: 110, useAdvancedWrap: true }, 
      align: 'center',
      lineSpacing: 2
    }).setOrigin(0.5).setVisible(false).setAlpha(0.95);
    
    const halo = this.add.graphics();
    halo.lineStyle(2, 0x94a3b8, 0.6);
    halo.strokeEllipse(0, -26, 12, 4);

    container.add([leftLeg, rightLeg, torso, head, label, thoughtBubble, halo]);
    torso.setInteractive(new Phaser.Geom.Rectangle(-8, -10, 16, 20), Phaser.Geom.Rectangle.Contains);
    return container;
  }

  private createNPC(data: NPCData) {
    const container = this.createCharacter(data.homeLocation.x, data.homeLocation.y, data.color, data.name);
    const torso = container.getAt(2) as Phaser.GameObjects.Image;
    torso.on('pointerdown', () => { this.onNPCSelected(data); });
    this.physics.add.existing(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true); body.setBounce(0.5, 0.5);
    this.npcs.set(data.id, container);
    
    const halo = container.getAt(6) as Phaser.GameObjects.Graphics;
    halo.clear();
    halo.lineStyle(2, this.getMoodColor(data.mood), 0.6);
    halo.strokeEllipse(0, -26, 12, 4);
  }

  public updateNPCBubble(npcId: string, text: string, persistent: boolean = false) {
    const container = this.npcs.get(npcId);
    if (container) {
      const bubble = container.getAt(5) as Phaser.GameObjects.Text;
      bubble.setText(text); bubble.setVisible(true);
      if (!persistent) {
        this.time.delayedCall(5000, () => { if (bubble.active) bubble.setVisible(false); });
      }
    }
  }

  public hideNPCBubble(npcId: string) {
    const container = this.npcs.get(npcId);
    if (container) {
      const bubble = container.getAt(5) as Phaser.GameObjects.Text;
      bubble.setVisible(false);
    }
  }

  private incrementTime() {
    this.worldTime = (this.worldTime + 0.1) % 24;
    const period = this.getTimePeriod();
    
    if (period !== this.lastPeriod) {
      this.lastPeriod = period;
      if (period === TimeOfDay.NIGHT) {
        this.npcData.forEach(npc => {
          npc.destination = { x: npc.homeLocation.x, y: npc.homeLocation.y };
          npc.targetLocationName = "Home";
        });
      }
    }
    
    this.onTimeUpdate(this.worldTime, period);
    const alpha = period === TimeOfDay.NIGHT ? 0.6 : (period === TimeOfDay.EVENING ? 0.85 : 1);
    this.cameras.main.setAlpha(alpha);
  }

  private async triggerAIThoughts() {
    if (this.getTimePeriod() === TimeOfDay.NIGHT) return; // Don't think while sleeping
    
    const randomNpc = this.npcData[Math.floor(Math.random() * this.npcData.length)];
    if (this.proximityState.get(randomNpc.id) || randomNpc.interactingWith) return;
    const period = this.getTimePeriod();
    const cognition = await cognitionEngine.processNPCCognition(randomNpc, period, false);
    randomNpc.currentThought = cognition.thought;
    randomNpc.mood = cognition.mood;
    
    if (cognition.thought && cognition.thought !== "...") {
        this.onNPCThought(randomNpc.id, cognition.thought, 'thought');
        this.updateNPCBubble(randomNpc.id, cognition.thought);
        
        const container = this.npcs.get(randomNpc.id);
        if (container) {
          const halo = container.getAt(6) as Phaser.GameObjects.Graphics;
          halo.clear();
          halo.lineStyle(2, this.getMoodColor(randomNpc.mood), 0.6);
          halo.strokeEllipse(0, -26, 12, 4);
        }
    }
  }

  private getTimePeriod(): TimeOfDay {
    if (this.worldTime >= 6 && this.worldTime < 12) return TimeOfDay.MORNING;
    if (this.worldTime >= 12 && this.worldTime < 18) return TimeOfDay.EVENING;
    return TimeOfDay.NIGHT;
  }

  private animateCharacter(container: Phaser.GameObjects.Container, isMoving: boolean, npcId?: string) {
    const leftLeg = container.getAt(0) as Phaser.GameObjects.Rectangle;
    const rightLeg = container.getAt(1) as Phaser.GameObjects.Rectangle;
    const torso = container.getAt(2) as Phaser.GameObjects.Image;
    const head = container.getAt(3) as Phaser.GameObjects.Image;
    const halo = container.getAt(6) as Phaser.GameObjects.Graphics;

    const isNight = this.getTimePeriod() === TimeOfDay.NIGHT;
    const isSleeping = isNight && !isMoving;

    if (isMoving) {
      this.stopIdleAnimations(npcId);
      const time = this.time.now;
      const legSweep = Math.sin(time * 0.01) * 8; const bob = Math.abs(Math.sin(time * 0.01)) * 2;
      leftLeg.y = 12 - bob; leftLeg.height = 10 + legSweep;
      rightLeg.y = 12 - bob; rightLeg.height = 10 - legSweep;
      torso.y = -bob; head.y = -14 - bob;
      halo.y = -bob;
      torso.angle = 0;
      head.angle = 0;
    } else {
      leftLeg.y = 12; leftLeg.height = 10; rightLeg.y = 12; rightLeg.height = 10; torso.y = 0; head.y = -14;
      halo.y = 0;
      if (isSleeping) {
        torso.angle = 15;
        head.angle = 10;
        halo.setVisible(false);
      } else {
        torso.angle = 0;
        head.angle = 0;
        halo.setVisible(true);
        if (npcId) this.startIdleAnimations(container, npcId);
      }
    }
  }

  private startIdleAnimations(container: Phaser.GameObjects.Container, npcId: string) {
    if (this.idleTweens.has(npcId)) return;
    const torso = container.getAt(2) as Phaser.GameObjects.Image;
    const halo = container.getAt(6) as Phaser.GameObjects.Graphics;
    let tweens: Phaser.Tweens.Tween[] = [];
    tweens.push(this.tweens.add({ targets: torso, scaleY: 1.03, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    tweens.push(this.tweens.add({ targets: halo, alpha: 0.3, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    this.idleTweens.set(npcId, tweens);
  }

  private stopIdleAnimations(npcId?: string) {
    if (!npcId) return;
    const tweens = this.idleTweens.get(npcId);
    if (tweens) {
      tweens.forEach(t => t.stop());
      this.idleTweens.delete(npcId);
      const container = this.npcs.get(npcId);
      if (container) {
        (container.getAt(3) as Phaser.GameObjects.Image).angle = 0;
        (container.getAt(2) as Phaser.GameObjects.Image).scaleY = 1;
        (container.getAt(6) as Phaser.GameObjects.Graphics).alpha = 1;
      }
    }
  }

  update() {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocity(0);
    if (this.cursors.left?.isDown) playerBody.setVelocityX(-160);
    else if (this.cursors.right?.isDown) playerBody.setVelocityX(160);
    if (this.cursors.up?.isDown) playerBody.setVelocityY(-160);
    else if (this.cursors.down?.isDown) playerBody.setVelocityY(160);
    this.animateCharacter(this.player, playerBody.velocity.length() > 0);

    const now = this.time.now;
    const period = this.getTimePeriod();
    const speedMultiplier = period === TimeOfDay.EVENING ? 0.6 : (period === TimeOfDay.NIGHT ? 1.2 : 1.0);

    this.npcData.forEach((data, i) => {
      const container = this.npcs.get(data.id);
      if (!container) return;
      const body = container.body as Phaser.Physics.Arcade.Body;

      if (data.destination) {
        const dist = Phaser.Math.Distance.Between(container.x, container.y, data.destination.x, data.destination.y);
        if (dist > 15) {
          this.physics.moveTo(container, data.destination.x, data.destination.y, 80 * speedMultiplier);
        } else {
          body.setVelocity(0);
          const reachedLoc = data.targetLocationName;
          data.destination = null;
          data.targetLocationName = null;
          if (reachedLoc) {
            this.onNPCReachedLocation(data.id, reachedLoc);
          }
        }
      } else if (period !== TimeOfDay.NIGHT && !data.interactingWith && Phaser.Math.Between(0, 1000) > 995) {
        this.physics.velocityFromAngle(Phaser.Math.Between(0, 360), 40 * speedMultiplier, body.velocity);
      } else if (period === TimeOfDay.NIGHT && !data.destination) {
        body.setVelocity(0);
      }

      this.animateCharacter(container, body.velocity.length() > 10, data.id);

      const distToPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
      const isNearPlayer = distToPlayer < 90;
      const wasNearPlayer = this.proximityState.get(data.id);

      if (isNearPlayer) {
        if (data.interactingWith === 'player') {
            body.setVelocity(0);
            if (!wasNearPlayer) {
                this.proximityState.set(data.id, true);
                this.onNPCApproach(data);
            }
        } else if (period !== TimeOfDay.NIGHT) {
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, container.x, container.y);
            this.physics.velocityFromRotation(angle, 100 * speedMultiplier, body.velocity);
            this.proximityState.set(data.id, false);
        }
      } else if (wasNearPlayer) {
        this.proximityState.set(data.id, false);
        this.hideNPCBubble(data.id);
        if (data.interactingWith === 'player') data.interactingWith = null;
      }

      // Inter-NPC Interaction (Day/Evening only)
      if (period !== TimeOfDay.NIGHT && !data.interactingWith && !data.destination && (this.interactionCooldowns.get(data.id) || 0) < now && distToPlayer > 120) {
        for (let j = i + 1; j < this.npcData.length; j++) {
          const other = this.npcData[j];
          const otherContainer = this.npcs.get(other.id);
          if (!otherContainer || other.interactingWith || other.destination || (this.interactionCooldowns.get(other.id) || 0) > now) continue;
          const dist = Phaser.Math.Distance.Between(container.x, container.y, otherContainer.x, otherContainer.y);
          if (dist < 60) {
            data.interactingWith = other.id;
            other.interactingWith = data.id;
            body.setVelocity(0);
            (otherContainer.body as Phaser.Physics.Arcade.Body).setVelocity(0);
            this.onNPCtoNPCInteraction(data, other);
            break;
          }
        }
      }
    });
  }

  public setInteractionCooldown(npcId: string, durationMs: number) {
    this.interactionCooldowns.set(npcId, this.time.now + durationMs);
  }
}
