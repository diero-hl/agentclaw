import { agents, reviews, conversations, messages, type Agent, type InsertAgent, type Review, type InsertReview } from "@/shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getAgents(): Promise<Agent[]>;
  getAgentBySlug(slug: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  incrementViews(slug: string): Promise<void>;
  incrementPurchases(slug: string): Promise<void>;
  getReviewsByAgentId(agentId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateAgentRating(agentId: string): Promise<void>;
}

class DatabaseStorage implements IStorage {
  async getAgents(): Promise<Agent[]> {
    return db.select().from(agents).orderBy(desc(agents.purchases));
  }

  async getAgentBySlug(slug: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.slug, slug));
    return agent;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [created] = await db.insert(agents).values(agent).returning();
    return created;
  }

  async incrementViews(slug: string): Promise<void> {
    const agent = await this.getAgentBySlug(slug);
    if (agent) {
      await db.update(agents).set({ views: agent.views + 1 }).where(eq(agents.slug, slug));
    }
  }

  async incrementPurchases(slug: string): Promise<void> {
    const agent = await this.getAgentBySlug(slug);
    if (agent) {
      await db.update(agents).set({ purchases: agent.purchases + 1 }).where(eq(agents.slug, slug));
    }
  }

  async getReviewsByAgentId(agentId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.agentId, agentId)).orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async updateAgentRating(agentId: string): Promise<void> {
    const allReviews = await this.getReviewsByAgentId(agentId);
    if (allReviews.length === 0) return;
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await db.update(agents).set({
      rating: avg.toFixed(2),
      reviewCount: allReviews.length,
    }).where(eq(agents.id, agentId));
  }
}

export const storage = new DatabaseStorage();

export const chatStorage = {
  async getConversation(id: number) {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  },

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string, agentSlug?: string) {
    const [conversation] = await db.insert(conversations).values({ title, agentSlug: agentSlug || null }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return message;
  },
};
