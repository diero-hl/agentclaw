import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertAgentSchema } from "@/shared/schema";
import { z } from "zod";

export async function GET() {
  try {
    const agents = await storage.getAgents();
    return NextResponse.json(agents);
  } catch (err) {
    console.error("Failed to get agents:", err);
    return NextResponse.json({ message: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agentData = insertAgentSchema.parse(body);
    const agent = await storage.createAgent(agentData);
    return NextResponse.json(agent, { status: 201 });
  } catch (err: any) {
    console.error("Failed to create agent:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid agent data", errors: err.errors }, { status: 400 });
    }
    if (err.code === "23505") {
      return NextResponse.json({ message: "An agent with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ message: "Failed to create agent" }, { status: 500 });
  }
}
