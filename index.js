#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Create server instance
const server = new Server(
  {
    name: "learning-resource-finder",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_learning_resources",
        description: "Search for learning resources (videos and articles) on any topic",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "The topic to search for (e.g., 'React hooks', 'Python basics')",
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results per source (default: 5)",
              default: 5,
            },
          },
          required: ["topic"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_learning_resources") {
    const topic = args.topic;
    try {
      // Example endpoint – replace with your real one
      const url = `https://dev.to/api/articles/latest?tag=${encodeURIComponent(topic)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Format the returned results
      const results = {
        topic,
        articles: data.slice(0,7).map((article) => ({
          title: article.title,
          url: article.url,
        })),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };

    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching learning resources: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});


// Start the server
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Server started and listening on stdio");
    } catch (error) {
        console.error("Failed to start server", error);
        process.exit(1);
    }
}

main();