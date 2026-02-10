"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CategoryFilter } from "@/components/category-filter";
import { SearchBar } from "@/components/search-bar";
import { AgentCard } from "@/components/agent-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MessageCircle, Zap, ArrowRight, Shield, Clock } from "lucide-react";
import type { Agent, Category } from "@/shared/schema";

function HeroSection({ agentCount }: { agentCount: number }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="py-16 md:py-24 text-center relative">
        <div className="max-w-3xl mx-auto px-6">
          {agentCount > 0 && (
            <Badge variant="outline" className="mb-6 text-xs font-normal gap-1.5 no-default-hover-elevate no-default-active-elevate" data-testid="badge-agent-count">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {agentCount} agents available
            </Badge>
          )}
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-5" data-testid="text-hero-title">
            Deploy AI agents<br />in 60 seconds.
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto mb-10" data-testid="text-hero-subtitle">
            Your own AI assistant for e-commerce, preconfigured and ready to chat. Sales, inventory, support, and more.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground mb-12">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Instant setup
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              AI-powered chat
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              100% free
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-500" />
              No API key needed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedSection({ agents }: { agents: Agent[] }) {
  const featured = agents.filter(a => a.featured).slice(0, 4);
  if (featured.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 pb-10">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider" data-testid="text-featured-title">Featured Agents</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {featured.map((agent) => {
          const firstLetter = agent.name.charAt(0).toUpperCase();
          return (
            <Link key={agent.id} href={`/agent/${agent.slug}`}>
              <Card className="group cursor-pointer overflow-visible hover-elevate active-elevate-2 transition-all duration-200 h-full" data-testid={`featured-${agent.slug}`}>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground">{firstLetter}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium truncate">{agent.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{agent.category}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");

  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const filtered = useMemo(() => {
    if (!agents) return [];
    let result = [...agents];

    if (category !== "All") {
      result = result.filter((a) => a.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.shortDescription.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [agents, category, search]);

  const showFeatured = category === "All" && !search.trim();

  return (
    <div className="min-h-screen bg-background">
      <HeroSection agentCount={agents?.length ?? 0} />

      <div className="max-w-3xl mx-auto px-6 pb-8">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {showFeatured && agents && <FeaturedSection agents={agents} />}

      <div className="max-w-5xl mx-auto px-6 pb-4">
        <CategoryFilter selected={category} onSelect={setCategory} />
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16 pt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-no-results">No agents found</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategory("All");
                setSearch("");
              }}
              data-testid="button-clear-filters"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider" data-testid="text-browse-title">
                {category === "All" ? "All Agents" : category}
              </h2>
              <span className="text-xs text-muted-foreground" data-testid="text-agent-count">
                {filtered.length} {filtered.length === 1 ? "agent" : "agents"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
