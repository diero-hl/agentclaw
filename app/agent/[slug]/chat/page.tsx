"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Agent } from "@/shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AgentChat() {
  const params = useParams();
  const slug = params?.slug as string;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ["/api/agents", slug],
    enabled: !!slug,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !slug) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch(`/api/agents/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, conversationId }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "content") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: last.content + event.data };
                }
                return updated;
              });
            } else if (event.type === "conversation_id") {
              setConversationId(event.data);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = { ...last, content: "Sorry, something went wrong. Please try again." };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b p-4">
          <Skeleton className="h-8 w-60" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-20 w-80" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4" data-testid="text-not-found">Agent not found</p>
          <Link href="/">
            <Button variant="ghost" data-testid="button-back-marketplace">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const firstLetter = agent.name.charAt(0).toUpperCase();

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col bg-background">
      <div className="border-b bg-background/80 backdrop-blur-xl px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href={`/agent/${slug}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-chat">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-muted-foreground">{firstLetter}</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold truncate" data-testid="text-chat-agent-name">{agent.name}</h1>
          <p className="text-[11px] text-muted-foreground">{agent.category}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
                <span className="text-xl font-semibold text-muted-foreground">{firstLetter}</span>
              </div>
              <h2 className="text-base font-semibold mb-2" data-testid="text-chat-welcome">Chat with {agent.name}</h2>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-6">
                Ask me anything about {agent.category.toLowerCase()}. I can help with strategies, best practices, and specific recommendations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
                {agent.capabilities?.slice(0, 4).map((cap) => (
                  <button
                    key={cap}
                    className="text-left px-3 py-2.5 rounded-md border border-border text-xs text-muted-foreground hover-elevate active-elevate-2 transition-colors"
                    onClick={() => {
                      setInput(`How can you help me with ${cap}?`);
                      textareaRef.current?.focus();
                    }}
                    data-testid={`button-suggestion-${cap.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <MessageCircle className="w-3 h-3 mb-1 text-muted-foreground/40" />
                    {cap}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">{firstLetter}</span>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
                data-testid={`message-${msg.role}-${i}`}
              >
                {msg.content ? (
                  msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>h1]:font-semibold [&>h2]:font-semibold [&>h3]:font-semibold [&>h1]:mb-2 [&>h2]:mb-2 [&>h3]:mb-1 [&_li]:mb-0.5 [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-medium">You</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-background/80 backdrop-blur-xl px-6 py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${agent.name} anything...`}
            rows={1}
            className="flex-1 resize-none rounded-md border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-[120px]"
            disabled={isStreaming}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            data-testid="button-send-message"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
