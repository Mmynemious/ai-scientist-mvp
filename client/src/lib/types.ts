import { 
  Session, 
  AgentResult, 
  UploadedFile, 
  SessionMemory, 
  AgentTypeKey 
} from "@shared/schema";

export interface AgentConfig {
  id: AgentTypeKey;
  name: string;
  description: string;
  icon: string;
  order: number;
  dependencies: AgentTypeKey[];
}

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'thesis',
    name: 'Thesis Agent',
    description: 'Extract key variables and keywords from research question',
    icon: 'fas fa-lightbulb',
    order: 1,
    dependencies: []
  },
  {
    id: 'file',
    name: 'File Agent', 
    description: 'Parse PDFs and research documents',
    icon: 'fas fa-file-alt',
    order: 2,
    dependencies: []
  },
  {
    id: 'search',
    name: 'Search Agent',
    description: 'Pull relevant papers from ArXiv and databases',
    icon: 'fas fa-search',
    order: 3,
    dependencies: ['thesis']
  },
  {
    id: 'reader',
    name: 'Reader Agent',
    description: 'Summarize papers using LLM analysis',
    icon: 'fas fa-book-reader',
    order: 4,
    dependencies: ['search']
  },
  {
    id: 'trend',
    name: 'Trend Agent',
    description: 'Detect patterns and contradictions across sources',
    icon: 'fas fa-chart-line',
    order: 5,
    dependencies: ['reader']
  },
  {
    id: 'hypothesis',
    name: 'Hypothesis Agent',
    description: 'Generate experimental directions and hypotheses',
    icon: 'fas fa-flask',
    order: 6,
    dependencies: ['trend']
  },
  {
    id: 'map',
    name: 'Map Agent',
    description: 'Create visual pipeline and research roadmap',
    icon: 'fas fa-project-diagram',
    order: 7,
    dependencies: ['hypothesis']
  }
];

export interface SessionState {
  currentSession: Session | null;
  sessionMemory: SessionMemory;
  agentResults: Record<AgentTypeKey, AgentResult | null>;
  isLoading: boolean;
  error: string | null;
}

export interface AgentExecutionRequest {
  sessionId: string;
  agentType: AgentTypeKey;
}

export interface FileUploadResult {
  files: UploadedFile[];
  agentResult: AgentResult;
}

export * from "@shared/schema";
