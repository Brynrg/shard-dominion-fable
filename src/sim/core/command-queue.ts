// Command queue: log of player/AI intents

import type { Command, Tick } from './types.js';

export class CommandQueue {
  private commands: Command[] = [];

  // Enqueue a command
  enqueue(command: Command): void {
    this.commands.push(command);
  }

  // Get all commands up to a tick
  getCommandsUpTo(tick: Tick): Command[] {
    return this.commands.filter((cmd) => cmd.tick <= tick);
  }

  // Get all commands
  getAll(): Command[] {
    return [...this.commands];
  }

  // Clear all commands
  clear(): void {
    this.commands = [];
  }

  // Get the latest command for a player
  getLatestCommand(playerId: number): Command | undefined {
    const playerCommands = this.commands.filter((cmd) => cmd.playerId === playerId);
    if (playerCommands.length === 0) {
      return undefined;
    }
    return playerCommands[playerCommands.length - 1];
  }
}