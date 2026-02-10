import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { storage, chatStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const agent = await storage.getAgentBySlug(slug);
    if (!agent) {
      return new Response(JSON.stringify({ message: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { message, conversationId } = await req.json();
    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ message: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let convId = conversationId;

    if (!convId) {
      const conv = await chatStorage.createConversation(agent.name, agent.slug);
      convId = conv.id;
    }

    await chatStorage.createMessage(convId, "user", message);

    const existingMessages = await chatStorage.getMessagesByConversation(convId);
    const chatHistory: { role: "user" | "assistant"; content: string }[] = [];

    for (const m of existingMessages) {
      chatHistory.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      });
    }

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      system: agent.systemPrompt || "You are a helpful AI assistant.",
      messages: chatHistory,
      max_tokens: 2048,
    });

    let fullResponse = "";

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "conversation_id", data: convId })}\n\n`)
          );

          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const content = event.delta.text;
              if (content) {
                fullResponse += content;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "content", data: content })}\n\n`)
                );
              }
            }
          }

          await chatStorage.createMessage(convId, "assistant", fullResponse);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (err) {
          console.error("Streaming error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", data: "Failed to get response" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Failed to chat with agent:", err);
    return new Response(JSON.stringify({ message: "Failed to chat with agent" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
