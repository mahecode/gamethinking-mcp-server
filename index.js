#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import chalk from 'chalk';

class GameThinkingServer {
  constructor() {
    this.thoughtHistory = [];
    this.branches = {};
  }

  validateGameThoughtData(input) {
    const data = input;

    if (!data.thought || typeof data.thought !== 'string') {
      throw new Error('Invalid thought: must be a string');
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
      isRevision: data.isRevision,
      revisesThought: data.revisesThought,
      branchFromThought: data.branchFromThought,
      branchId: data.branchId,
      needsMoreThoughts: data.needsMoreThoughts,
    };
  }

  formatGameThought(thoughtData) {
    const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId } = thoughtData;

    let prefix = '';
    let context = '';

    if (isRevision) {
      prefix = chalk.yellow('🎮 Rule Tweak');
      context = ` (adjusting thought ${revisesThought})`;
    } else if (branchFromThought) {
      prefix = chalk.green('🕹️ Strategy Shift');
      context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
    } else {
      prefix = chalk.blue('🎲 Game Idea');
      context = '';
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
    const border = '─'.repeat(Math.max(header.length, thought.length) + 4);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
  }

  processGameThought(input) {
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

const gameThinkingServer = new GameThinkingServer();

// Create an MCP server
const server = new McpServer({
  name: "game-thinking-server",
  version: "0.2.0"
});

// Define the schema for the gamethinking tool
const gameThinkingSchema = z.object({
  thought: z.string().describe("Your current game thinking step"),
  nextThoughtNeeded: z.boolean().describe("Whether more steps are needed"),
  thoughtNumber: z.number().int().min(1).describe("Current thought number"),
  totalThoughts: z.number().int().min(1).describe("Estimated total thoughts"),
  isRevision: z.boolean().optional().describe("Whether this revises a previous thought"),
  revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered"),
  branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number"),
  branchId: z.string().optional().describe("Branch identifier"),
  needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed")
});

// Add the gamethinking tool
server.tool(
  "gamethinking",
  gameThinkingSchema,
  async (args) => {
    return gameThinkingServer.processGameThought(args);
  },
  {
    description: `A tool for dynamic and iterative game-related problem-solving.
This tool supports designing game mechanics, balancing gameplay, analyzing strategies, or crafting narratives through a flexible, step-by-step thinking process.

When to use this tool:
- Designing game mechanics or rules
- Balancing difficulty, rewards, or player progression
- Strategizing moves or solving game puzzles
- Developing game narratives or world-building
- Iterating on playtesting feedback
- Exploring alternative game design approaches

Key features:
- Adjust total thoughts as the game concept evolves
- Revise mechanics or strategies based on new insights
- Branch into alternative gameplay ideas or scenarios
- Express uncertainty about player experience or balance
- Build and verify a cohesive game design or solution
- Filter out irrelevant details to focus on core gameplay

Parameters explained:
- thought: Your current game-related idea, which can include:
* New mechanics or rules
* Adjustments to existing designs
* Questions about player experience
* Strategic moves or puzzle solutions
* Narrative beats or world details
* Hypotheses about gameplay outcomes
- next_thought_needed: True if more steps are needed to refine the game
- thought_number: Current step in the sequence
- total_thoughts: Estimated steps needed (adjustable)
- is_revision: If this tweaks a previous idea
- revises_thought: Which thought is being adjusted
- branch_from_thought: Starting point for an alternative approach
- branch_id: Identifier for the current alternative
- needs_more_thoughts: If the design needs further exploration

You should:
1. Start with an initial game concept or problem
2. Break it into mechanics, strategies, or narrative steps
3. Revise or branch as needed based on playability or fun
4. Ignore details unrelated to the current focus
5. Propose a hypothesis (e.g., "This mechanic will engage players")
6. Verify it through the thought chain
7. Iterate until satisfied with the game design or solution
8. Set next_thought_needed to false when the game idea is complete`
  }
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Game Thinking MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 