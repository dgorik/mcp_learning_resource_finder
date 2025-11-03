import 'dotenv/config';

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
  const ytKey = process.env.YOUTUBE_API_KEY //add an API KEY locally bc Claude doesn't support env variables yet
  const maxResults = args.maxResults || 5;

  if (name === "search_learning_resources") {
    const topic = args.topic;
    try {
      // Example endpoint – replace with your real one
      const url_dev_to = `https://dev.to/api/articles/?tag=${encodeURIComponent(topic)}&per_page=${maxResults}`;
      const url_you_tube = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&maxResults=${maxResults}&key=${ytKey}`

      const [responseDev, responseYouTube ] = await Promise.all([
        fetch(url_dev_to),
        fetch(url_you_tube),
      ]);
      
      if (!responseDev.ok) throw new Error(`Dev.to API failed: ${responseDev.status}`);
      if (!responseYouTube.ok) throw new Error(`YouTube API failed: ${responseYouTube.status}`);

      const [devtoData, youtubeData ] = await Promise.all([
        responseDev.json(),
        responseYouTube.json()
      ]);

      const results = {
        topic,
        articles: devtoData.map((article) => ({
          title: article.title,
          url: article.url,
        })),
        videos: youtubeData.items.map((video) => ({
          title: video.snippet.title,
          description: video.snippet.description,
          url:`https://www.youtube.com/watch?v=${video.id.videoId}`,
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
        console.log("Server started and listening on stdio");
    } catch (error) {
        console.error("Failed to start server", error);
        process.exit(1);
    }
}

main();