import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { 
  insertSessionSchema, 
  insertAgentResultSchema,
  sessionMemorySchema,
  AgentType,
  type SessionMemory
} from "@shared/schema";
import { openaiService } from "./services/openai";
import { arxivService } from "./services/arxiv";
import { pdfParserService } from "./services/pdf-parser";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Session management routes
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse({
        ...req.body,
        id: nanoid(),
        sessionData: sessionMemorySchema.parse(req.body.sessionData || {})
      });
      
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.listSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    try {
      const updates = insertSessionSchema.partial().parse(req.body);
      if (updates.sessionData) {
        updates.sessionData = sessionMemorySchema.parse(updates.sessionData);
      }
      
      const session = await storage.updateSession(req.params.id, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSession(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Agent execution routes
  app.post("/api/sessions/:id/agents/:agentType/execute", async (req, res) => {
    try {
      const { id: sessionId, agentType } = req.params;
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      let result;
      
      switch (agentType) {
        case AgentType.THESIS:
          result = await openaiService.analyzeThesis(session.researchQuestion);
          break;
          
        case AgentType.SEARCH:
          const thesisResult = await storage.getAgentResult(sessionId, AgentType.THESIS);
          if (!thesisResult?.metadata?.keywords) {
            return res.status(400).json({ message: "Thesis analysis required first" });
          }
          result = await arxivService.searchPapers(thesisResult.metadata.keywords);
          break;
          
        case AgentType.FILE:
          // File agent is handled separately via upload endpoint
          return res.status(400).json({ message: "Use file upload endpoint for File Agent" });
          
        case AgentType.READER:
          const searchResult = await storage.getAgentResult(sessionId, AgentType.SEARCH);
          if (!searchResult?.metadata?.papers) {
            return res.status(400).json({ message: "Search results required first" });
          }
          
          // Summarize first paper as example
          const firstPaper = searchResult.metadata.papers[0];
          if (firstPaper) {
            result = await openaiService.summarizePaper(firstPaper.abstract, firstPaper.title);
          } else {
            result = {
              agent: "ReaderAgent",
              result: "No papers available to summarize",
              confidence: 0,
              sources: [],
              warnings: ["No papers found"],
              metadata: {}
            };
          }
          break;
          
        case AgentType.TREND:
          const readerResults = await storage.getAgentResults(sessionId);
          const summaries = readerResults
            .filter(r => r.agentType === AgentType.READER && r.metadata)
            .map(r => r.metadata);
          
          if (summaries.length === 0) {
            return res.status(400).json({ message: "Paper summaries required first" });
          }
          
          result = await openaiService.analyzeTrends(summaries);
          break;
          
        case AgentType.HYPOTHESIS:
          const thesisData = await storage.getAgentResult(sessionId, AgentType.THESIS);
          const trendData = await storage.getAgentResult(sessionId, AgentType.TREND);
          
          if (!thesisData?.metadata || !trendData?.metadata) {
            return res.status(400).json({ message: "Thesis and trend analysis required first" });
          }
          
          result = await openaiService.generateHypotheses(
            session.researchQuestion,
            trendData.metadata,
            thesisData.metadata.variables
          );
          break;
          
        case AgentType.MAP:
          // Generate pipeline map based on all previous results
          const allResults = await storage.getAgentResults(sessionId);
          result = {
            agent: "MapAgent",
            result: "Generated research pipeline map",
            confidence: 0.9,
            sources: ["All agent results"],
            warnings: [],
            metadata: {
              mermaidDiagram: this.generateMermaidDiagram(allResults),
              results: allResults
            }
          };
          break;
          
        default:
          return res.status(400).json({ message: "Invalid agent type" });
      }

      // Save agent result
      const agentResultData = insertAgentResultSchema.parse({
        sessionId,
        agentType,
        result: result.result,
        confidence: Math.round(result.confidence * 100),
        sources: result.sources,
        warnings: result.warnings,
        metadata: result.metadata || {},
        status: "completed"
      });

      const savedResult = await storage.createAgentResult(agentResultData);
      
      // Update session memory
      const memory = session.sessionData as SessionMemory;
      memory.lastUpdate = new Date().toISOString();
      memory.agentProgress[agentType] = "completed";
      
      if (agentType === AgentType.THESIS && result.metadata?.keywords) {
        memory.keywords = result.metadata.keywords;
        memory.focus = result.metadata.summary;
        memory.variables = result.metadata.variables;
      }
      
      if (agentType === AgentType.SEARCH && result.metadata?.papers) {
        memory.paperCount = result.metadata.papers.length;
      }

      await storage.updateSession(sessionId, { sessionData: memory });
      
      res.json(savedResult);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // File upload route
  app.post("/api/sessions/:id/upload", upload.array('files', 10), async (req, res) => {
    try {
      const sessionId = req.params.id;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = [];
      
      for (const file of files) {
        const parseResult = await pdfParserService.parseUploadedFile(file.buffer, file.originalname);
        
        const fileData = {
          sessionId,
          filename: nanoid() + '-' + file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          parsedContent: parseResult.metadata?.extractedText || null
        };
        
        const savedFile = await storage.createUploadedFile(fileData);
        uploadedFiles.push(savedFile);
      }

      // Create File Agent result
      const agentResult = insertAgentResultSchema.parse({
        sessionId,
        agentType: AgentType.FILE,
        result: `Processed ${uploadedFiles.length} files`,
        confidence: 95,
        sources: uploadedFiles.map(f => f.originalName),
        warnings: [],
        metadata: { uploadedFiles },
        status: "completed"
      });

      const savedResult = await storage.createAgentResult(agentResult);
      
      res.json({ files: uploadedFiles, agentResult: savedResult });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get agent results for a session
  app.get("/api/sessions/:id/results", async (req, res) => {
    try {
      const results = await storage.getAgentResults(req.params.id);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update agent result (for user feedback)
  app.put("/api/results/:id", async (req, res) => {
    try {
      const updates = insertAgentResultSchema.partial().parse(req.body);
      const result = await storage.updateAgentResult(parseInt(req.params.id), updates);
      
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate Mermaid diagram
function generateMermaidDiagram(results: any[]): string {
  const completed = results.map(r => r.agentType);
  
  return `graph TD
    A[Research Question] --> B[Thesis Analysis]
    B --> C[File Processing]
    B --> D[Literature Search]
    C --> E[Paper Summarization]
    D --> E
    E --> F[Trend Analysis]
    F --> G[Hypothesis Generation]
    G --> H[Research Pipeline]
    
    ${completed.includes('thesis') ? 'B:::completed' : 'B:::pending'}
    ${completed.includes('file') ? 'C:::completed' : 'C:::pending'}
    ${completed.includes('search') ? 'D:::completed' : 'D:::pending'}
    ${completed.includes('reader') ? 'E:::completed' : 'E:::pending'}
    ${completed.includes('trend') ? 'F:::completed' : 'F:::pending'}
    ${completed.includes('hypothesis') ? 'G:::completed' : 'G:::pending'}
    ${completed.includes('map') ? 'H:::completed' : 'H:::pending'}
    
    classDef completed fill:#10b981,stroke:#065f46,color:#fff
    classDef pending fill:#6b7280,stroke:#374151,color:#fff`;
}
