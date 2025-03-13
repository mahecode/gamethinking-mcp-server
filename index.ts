#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import chalk from 'chalk';

interface GameThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string; // e.g., "physics-system" or "rendering-pipeline"
  gameComponent?: string; // e.g., "physics", "rendering", "controls"
  libraryUsed?: string; // e.g., "threejs", "cannonjs", "ammojs"
}

class GameDesignThinkingServer {
  private thoughtHistory: GameThoughtData[] = [];
  private branches: Record<string, GameThoughtData[]> = {};

  private validateGameThoughtData(input: unknown): GameThoughtData {
    const data = input as Record<string, unknown>;

    if (!data.thought || typeof data.thought !== 'string') {
      throw new Error('Invalid thought: must be a string describing game design decision');
    }
    if (!data.thoughtNumber || typeof data.thoughtNumber !== 'number') {
      throw new Error('Invalid thoughtNumber: must be a number');
    }
    if (!data.totalThoughts || typeof data.totalThoughts !== 'number') {
      throw new Error('Invalid totalThoughts: must be a number');
    }
    if (typeof data.nextThoughtNeeded !== 'boolean') {
      throw new Error('Invalid nextThoughtNeeded: must be a boolean');
    }

    return {
      thought: data.thought,
      thoughtNumber: data.thoughtNumber,
      totalThoughts: data.totalThoughts,
      nextThoughtNeeded: data.nextThoughtNeeded,
      isRevision: data.isRevision as boolean | undefined,
      revisesThought: data.revisesThought as number | undefined,
      branchFromThought: data.branchFromThought as number | undefined,
      branchId: data.branchId as string | undefined,
      gameComponent: data.gameComponent as string | undefined,
      libraryUsed: data.libraryUsed as string | undefined,
    };
  }

  private formatGameThought(thoughtData: GameThoughtData): string {
    const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, 
            branchFromThought, branchId, gameComponent, libraryUsed } = thoughtData;

    let prefix = '';
    let context = '';
    let componentInfo = gameComponent ? chalk.cyan(`[${gameComponent}]`) : '';
    let libraryInfo = libraryUsed ? chalk.magenta(`<${libraryUsed}>`) : '';

    if (isRevision) {
      prefix = chalk.yellow('🎮 Revision');
      context = ` (revising thought ${revisesThought})`;
    } else if (branchFromThought) {
      prefix = chalk.green('🎲 Branch');
      context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
    } else {
      prefix = chalk.blue('🕹️ Design');
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context} ${componentInfo} ${libraryInfo}`;
    const border = '─'.repeat(Math.max(header.length, thought.length) + 4);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
  }

  public processGameThought(input: unknown): { content: Array<{ type: string; text: string }>; isError?: boolean } {
    try {
      const validatedInput = this.validateGameThoughtData(input);

      if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
        validatedInput.totalThoughts = validatedInput.thoughtNumber;
      }

      this.thoughtHistory.push(validatedInput);

      if (validatedInput.branchFromThought && validatedInput.branchId) {
        if (!this.branches[validatedInput.branchId]) {
          this.branches[validatedInput.branchId] = [];
        }
        this.branches[validatedInput.branchId].push(validatedInput);
      }

      const formattedThought = this.formatGameThought(validatedInput);
      console.error(formattedThought);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            thoughtNumber: validatedInput.thoughtNumber,
            totalThoughts: validatedInput.totalThoughts,
            nextThoughtNeeded: validatedInput.nextThoughtNeeded,
            gameComponent: validatedInput.gameComponent,
            libraryUsed: validatedInput.libraryUsed,
            branches: Object.keys(this.branches),
            thoughtHistoryLength: this.thoughtHistory.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed'
          }, null, 2)
        }],
        isError: true
      };
    }
  }
}

const GAME_DESIGN_THINKING_TOOL: Tool = {
  name: "gamedesignthinking",
  description: `A tool for designing game mechanics and building games with Three.js and other open-source libraries.
This tool guides the game development process through structured thinking about mechanics, systems, and implementation.

When to use this tool:
- Designing core game mechanics
- Planning game systems architecture
- Implementing features with Three.js, Cannon.js, Ammo.js, etc.
- Creating game loops and state management
- Developing rendering pipelines
- Building physics systems
- Creating player controls and interactions

Key features:
- Tracks game components (physics, rendering, controls, etc.)
- Associates thoughts with specific libraries (Three.js, Cannon.js, etc.)
- Supports branching for different game systems
- Allows revision of game design decisions
- Flexible thought counting for iterative design
- Maintains context across game development steps

Parameters explained:
- thought: Current game design or implementation decision, e.g.:
* "Implement basic character movement with WASD controls"
* "Add physics using Cannon.js for object collisions"
* "Create Three.js scene with basic lighting"
- nextThoughtNeeded: True if more design steps are needed
- thoughtNumber: Current step in the design process
- totalThoughts: Estimated total design steps needed
- isRevision: If revising a previous game design decision
- revisesThought: Which previous thought is being revised
- branchFromThought: Starting point for a new system branch
- branchId: Identifier for system branch (e.g., "physics-system")
- gameComponent: Game system being worked on (e.g., "physics", "rendering")
- libraryUsed: Library being utilized (e.g., "threejs", "cannonjs")

You should:
1. Start with core game mechanic ideas
2. Break down implementation into components
3. Specify libraries for each component
4. Revise mechanics based on playtesting
5. Branch for parallel system development
6. Adjust totalThoughts as scope changes
7. Document Three.js/Cannon.js implementation details
8. Iterate until game design is complete`,
  inputSchema: {
    type: "object",
    properties: {
      thought: { type: "string", description: "Current game design/implementation thought" },
      nextThoughtNeeded: { type: "boolean", description: "If more steps are needed" },
      thoughtNumber: { type: "integer", minimum: 1, description: "Current step number" },
      totalThoughts: { type: "integer", minimum: 1, description: "Estimated total steps" },
      isRevision: { type: "boolean", description: "If revising previous thought" },
      revisesThought: { type: "integer", minimum: 1, description: "Thought being revised" },
      branchFromThought: { type: "integer", minimum: 1, description: "Branching point" },
      branchId: { type: "string", description: "Branch identifier" },
      gameComponent: { type: "string", description: "Game component being designed" },
      libraryUsed: { type: "string", description: "Library being used" }
    },
    required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
  }
};


const server = new Server(
  {
    name: "sequential-thinking-game-server",
    version: "0.3.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);


// Initialize the game design thinking server
const gameDesignServer = new GameDesignThinkingServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    GAME_DESIGN_THINKING_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "gamedesignthinking") {
    return gameDesignServer.processGameThought(request.params.arguments);
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Game Design Thinking MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
