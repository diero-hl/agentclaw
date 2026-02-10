"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Agent } from "@/shared/schema";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const firstLetter = agent.name.charAt(0).toUpperCase();
  const ratingNum = parseFloat(agent.rating ?? "0");

  return (
    <Link href={`/agent/${agent.slug}`}>
      <Card
        className="group cursor-pointer overflow-visible hover-elevate active-elevate-2 transition-all duration-200 h-full"
        data-testid={`card-agent-${agent.slug}`}
      >
        <div className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-muted-foreground">{firstLetter}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-snug" data-testid={`text-agent-name-${agent.slug}`}>
                {agent.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{agent.category}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {agent.shortDescription}
          </p>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            {ratingNum > 0 ? (
              <div className="flex items-center gap-1 text-xs" data-testid={`rating-${agent.slug}`}>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-muted-foreground">{ratingNum.toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground" data-testid={`status-new-${agent.slug}`}>New</span>
            )}
            <span className="text-xs text-muted-foreground" data-testid={`text-price-${agent.slug}`}>Free</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
