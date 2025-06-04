import { 
  sessions, 
  agentResults, 
  uploadedFiles,
  type Session, 
  type InsertSession,
  type AgentResult,
  type InsertAgentResult,
  type UploadedFile,
  type InsertUploadedFile,
  type SessionMemory
} from "@shared/schema";

export interface IStorage {
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;
  listSessions(): Promise<Session[]>;
  
  // Agent Results
  createAgentResult(result: InsertAgentResult): Promise<AgentResult>;
  getAgentResults(sessionId: string): Promise<AgentResult[]>;
  getAgentResult(sessionId: string, agentType: string): Promise<AgentResult | undefined>;
  updateAgentResult(id: number, updates: Partial<InsertAgentResult>): Promise<AgentResult | undefined>;
  
  // Files
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getUploadedFiles(sessionId: string): Promise<UploadedFile[]>;
  deleteUploadedFile(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;
  private agentResults: Map<number, AgentResult>;
  private uploadedFiles: Map<number, UploadedFile>;
  private currentAgentResultId: number;
  private currentFileId: number;

  constructor() {
    this.sessions = new Map();
    this.agentResults = new Map();
    this.uploadedFiles = new Map();
    this.currentAgentResultId = 1;
    this.currentFileId = 1;
  }

  // Session methods
  async createSession(insertSession: InsertSession): Promise<Session> {
    const now = new Date();
    const session: Session = {
      ...insertSession,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: Session = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async listSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  // Agent Result methods
  async createAgentResult(insertResult: InsertAgentResult): Promise<AgentResult> {
    const id = this.currentAgentResultId++;
    const result: AgentResult = {
      ...insertResult,
      id,
      timestamp: new Date(),
    };
    this.agentResults.set(id, result);
    return result;
  }

  async getAgentResults(sessionId: string): Promise<AgentResult[]> {
    return Array.from(this.agentResults.values())
      .filter(result => result.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getAgentResult(sessionId: string, agentType: string): Promise<AgentResult | undefined> {
    return Array.from(this.agentResults.values())
      .find(result => result.sessionId === sessionId && result.agentType === agentType);
  }

  async updateAgentResult(id: number, updates: Partial<InsertAgentResult>): Promise<AgentResult | undefined> {
    const result = this.agentResults.get(id);
    if (!result) return undefined;
    
    const updatedResult: AgentResult = {
      ...result,
      ...updates,
    };
    this.agentResults.set(id, updatedResult);
    return updatedResult;
  }

  // File methods
  async createUploadedFile(insertFile: InsertUploadedFile): Promise<UploadedFile> {
    const id = this.currentFileId++;
    const file: UploadedFile = {
      ...insertFile,
      id,
      uploadedAt: new Date(),
    };
    this.uploadedFiles.set(id, file);
    return file;
  }

  async getUploadedFiles(sessionId: string): Promise<UploadedFile[]> {
    return Array.from(this.uploadedFiles.values())
      .filter(file => file.sessionId === sessionId)
      .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  }

  async deleteUploadedFile(id: number): Promise<boolean> {
    return this.uploadedFiles.delete(id);
  }
}

export const storage = new MemStorage();
