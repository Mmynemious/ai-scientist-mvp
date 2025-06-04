import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Research Sessions
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // UUID
  title: text("title").notNull(),
  researchQuestion: text("research_question").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  sessionData: jsonb("session_data").notNull(), // SessionMemory object
});

// Agent Results
export const agentResults = pgTable("agent_results", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id).notNull(),
  agentType: text("agent_type").notNull(), // thesis, file, search, reader, trend, hypothesis, map
  result: text("result").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  sources: jsonb("sources").notNull(), // string array
  warnings: jsonb("warnings").notNull(), // string array
  metadata: jsonb("metadata").notNull(), // additional data specific to agent
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  userFeedback: text("user_feedback"), // accepted, rejected, edited
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Uploaded Files
export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  parsedContent: text("parsed_content"), // extracted text content
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Schema types and validation
export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAgentResultSchema = createInsertSchema(agentResults).omit({
  id: true,
  timestamp: true,
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  uploadedAt: true,
});

// Rich Output interface for standardized agent responses
export const richOutputSchema = z.object({
  agent: z.string(),
  result: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()),
  warnings: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
});

// Session Memory interface
export const sessionMemorySchema = z.object({
  focus: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  variables: z.record(z.string()).default({}),
  paperCount: z.number().default(0),
  lastUpdate: z.string().optional(),
  agentProgress: z.record(z.string()).default({}),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type AgentResult = typeof agentResults.$inferSelect;
export type InsertAgentResult = z.infer<typeof insertAgentResultSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type RichOutput = z.infer<typeof richOutputSchema>;
export type SessionMemory = z.infer<typeof sessionMemorySchema>;

// Agent types enum
export const AgentType = {
  THESIS: 'thesis',
  FILE: 'file', 
  SEARCH: 'search',
  READER: 'reader',
  TREND: 'trend',
  HYPOTHESIS: 'hypothesis',
  MAP: 'map'
} as const;

export type AgentTypeKey = typeof AgentType[keyof typeof AgentType];
