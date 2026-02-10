"use client";

import { HelpCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What is AgentClaw?",
    answer: "AgentClaw is an AI agent marketplace built for Shopify and e-commerce businesses. You can browse, deploy, and chat with specialized AI agents that handle sales, inventory, customer support, marketing, analytics, and more."
  },
  {
    question: "Are the agents really free?",
    answer: "Yes, all agents on AgentClaw are completely free to use. There are no hidden fees, no credit card required, and no usage limits. Just pick an agent and start chatting."
  },
  {
    question: "How do I start using an agent?",
    answer: "Simply browse the marketplace, click on any agent to see its details, then hit the Chat button. You'll be connected to the AI agent instantly and can start asking questions or getting help right away."
  },
  {
    question: "What kind of agents are available?",
    answer: "We offer agents across multiple categories: Sales (lead generation, upselling), Inventory (stock management, forecasting), Support (customer service, ticket handling), Marketing (SEO, social media), Analytics (data insights, reporting), and Operations (shipping, pricing optimization)."
  },
  {
    question: "Do I need an API key or any setup?",
    answer: "No setup required at all. No API keys, no integrations, no configuration. Every agent works instantly through our built-in chat interface."
  },
  {
    question: "Can I publish my own agent?",
    answer: "Yes! Click on Publish Agent in the sidebar to submit your own AI agent to the marketplace. Fill in the details about your agent and it will be available for everyone to use."
  },
  {
    question: "What AI model powers the agents?",
    answer: "All agents are powered by Anthropic's Claude model, providing fast, intelligent, and context-aware responses tailored to each agent's specialty."
  },
  {
    question: "Is my chat data private?",
    answer: "Your conversations are not stored permanently. Each chat session is independent and your data is not shared with other users or used for training purposes."
  },
  {
    question: "Can agents connect to my Shopify store?",
    answer: "Currently, agents provide advice and assistance through chat. Direct Shopify store integration is on our roadmap for future updates."
  },
  {
    question: "How do I report an issue or give feedback?",
    answer: "We welcome all feedback! You can reach out through the platform or leave a review on any agent's page to help us improve the experience."
  },
];

function FaqAccordion({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b border-border/50 last:border-0"
      data-testid={`faq-item-${index}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 px-1 text-left hover-elevate rounded-md"
        data-testid={`faq-toggle-${index}`}
      >
        <span className="text-sm font-medium">{item.question}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="pb-4 px-1" data-testid={`faq-answer-${index}`}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Faq() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold" data-testid="text-faq-title">Frequently Asked Questions</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Everything you need to know about AgentClaw and our AI agents.
        </p>
      </div>

      <div className="rounded-md border bg-card p-4" data-testid="faq-list">
        {faqs.map((item, i) => (
          <FaqAccordion key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
