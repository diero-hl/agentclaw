import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description").notNull(),
  fullDescription: text("full_description").notNull(),
  category: text("category").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  priceLabel: text("price_label").notNull().default("Free"),
  imageUrl: text("image_url").notNull(),
  capabilities: text("capabilities").array().notNull().default(sql`'{}'::text[]`),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  platforms: text("platforms").array().notNull().default(sql`'{}'::text[]`),
  publisherName: text("publisher_name").notNull(),
  publisherAvatar: text("publisher_avatar"),
  version: text("version").notNull().default("1.0.0"),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  purchases: integer("purchases").notNull().default(0),
  views: integer("views").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  systemPrompt: text("system_prompt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  agentSlug: text("agent_slug"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  reviewCount: true,
  views: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const CATEGORIES = [
  "All",
  "Marketing",
  "Sales",
  "Support",
  "Inventory",
  "Analytics",
  "Product",
  "Fulfillment",
  "Pricing",
  "Social Media",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "top-rated", label: "Top Rated" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
