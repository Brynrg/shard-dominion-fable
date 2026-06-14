// Main game scene: renders sim state, translates input to commands

import Phaser from 'phaser';
import type { Sim } from '../../sim/index.js';

export class GameScene extends Phaser.Scene {
  private sim: Sim;
  private entities: Map<number, Phaser.GameObjects.Sprite> = new Map();
  private lastTick: number = 0;

  constructor(sim: Sim) {
    super({ key: 'GameScene' });
    this.sim = sim;
  }

  create(): void {
    // Create a placeholder background
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b0b10);

    // Create a placeholder player unit
    const player = this.add.sprite(100, 100, 'player', 0);
    player.setOrigin(0.5);
    this.entities.set(0, player);

    // Create a placeholder enemy unit
    const enemy = this.add.sprite(300, 200, 'enemy', 0);
    enemy.setOrigin(0.5);
    this.entities.set(1, enemy);

    // Add a placeholder instruction
    const instruction = this.add.text(
      this.scale.width / 2,
      this.scale.height - 50,
      'Click to move',
      {
        fontSize: '18px',
        color: '#eaeaf0',
      }
    );
    instruction.setOrigin(0.5);

    // Add click handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleInput(pointer);
    });
  }

  update(): void {
    // Update the simulation
    this.sim.tick();

    // Update the view
    this.updateView();

    // Update the camera
    this.updateCamera();
  }

  private handleInput(_pointer: Phaser.Input.Pointer): void {
    // TODO: Translate input to commands
    // This will be filled in as we implement systems
  }

  private updateView(): void {
    const currentTick = this.sim.getTick();

    if (currentTick === this.lastTick) {
      return;
    }

    this.lastTick = currentTick;

    // TODO: Update entity positions based on sim state
    // This will be filled in as we implement systems
  }

  private updateCamera(): void {
    // TODO: Implement camera pan/zoom/edge
    // This will be filled in as we implement systems
  }
}