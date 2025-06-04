import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { AgentSidebar } from "@/components/agent-sidebar";
import { ResearchInput } from "@/components/research-input";
import { AgentResultComponent } from "@/components/agent-result";
import { FileUpload } from "@/components/file-upload";
import { PipelinePreview } from "@/components/pipeline-preview";
import { ProgressIndicator } from "@/components/progress-indicator";

import { useSession } from "@/hooks/use-session";
import { useAgents } from "@/hooks/use-agents";
import { AgentTypeKey, AGENT_CONFIGS } from "@/lib/types";

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<AgentTypeKey | null>(null);
  const [researchQuestion, setResearchQuestion] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const { toast } = useToast();

  const {
    currentSession,
    sessions,
    currentSessionId,
    isLoading: sessionLoading,
    isCreating: sessionCreating,
    createSession,
    loadSession,
    createError
  } = useSession();

  const {
    agentResults,
    isLoading: agentsLoading,
    isExecuting,
    isUploading,
    getAgentResult,
    getAgentStatus,
    canExecuteAgent,
    getCompletedAgents,
    getProgressPercentage,
    executeAgent,
    uploadFiles,
    approveResult,
    rejectResult,
    retryAgent,
    executeError,
    uploadError
  } = useAgents(currentSessionId);

  // Update research question when session loads
  useEffect(() => {
    if (currentSession && 'researchQuestion' in currentSession) {
      setResearchQuestion(currentSession.researchQuestion);
    }
  }, [currentSession]);

  // Show errors in toast
  useEffect(() => {
    if (createError) {
      toast({
        title: "Error",
        description: createError.message,
        variant: "destructive"
      });
    }
  }, [createError, toast]);

  useEffect(() => {
    if (executeError) {
      toast({
        title: "Agent Execution Error", 
        description: executeError.message,
        variant: "destructive"
      });
    }
  }, [executeError, toast]);

  useEffect(() => {
    if (uploadError) {
      toast({
        title: "File Upload Error",
        description: uploadError.message,
        variant: "destructive"
      });
    }
  }, [uploadError, toast]);

  const handleStartAnalysis = () => {
    if (!researchQuestion.trim()) {
      toast({
        title: "Error",
        description: "Please enter a research question first",
        variant: "destructive"
      });
      return;
    }

    if (!currentSession) {
      const title = sessionTitle.trim() || `Research Session - ${new Date().toLocaleDateString()}`;
      createSession(title, researchQuestion);
    } else {
      // Execute thesis agent if not already done
      const thesisStatus = getAgentStatus('thesis');
      if (thesisStatus === 'pending' && canExecuteAgent('thesis')) {
        executeAgent('thesis');
        setSelectedAgent('thesis');
      }
    }
  };

  const handleAgentSelect = (agentType: AgentTypeKey) => {
    setSelectedAgent(agentType);
    
    // Auto-execute if agent can be executed
    if (canExecuteAgent(agentType) && getAgentStatus(agentType) === 'pending') {
      executeAgent(agentType);
    }
  };

  const handleLoadSession = (sessionId: string) => {
    loadSession(sessionId);
    setShowLoadDialog(false);
    toast({
      title: "Session Loaded",
      description: "Research session loaded successfully"
    });
  };

  const handleClearAll = () => {
    setResearchQuestion("");
    setSessionTitle("");
    setSelectedAgent(null);
  };

  const handleFileUpload = (files: File[]) => {
    uploadFiles(files);
  };

  const handleSkipFiles = () => {
    setSelectedAgent('search');
  };

  const handleApproveResult = (resultId: number) => {
    approveResult(resultId);
    toast({
      title: "Result Approved",
      description: "Agent result has been approved"
    });
  };

  const handleRejectResult = (resultId: number) => {
    rejectResult(resultId);
    toast({
      title: "Result Rejected", 
      description: "Agent result has been rejected",
      variant: "destructive"
    });
  };

  const handleRetryAgent = (agentType: AgentTypeKey) => {
    retryAgent(agentType);
  };

  const sessionMemory = currentSession?.sessionData || {};
  const completedAgents = getCompletedAgents();
  const progressPercentage = getProgressPercentage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-flask text-primary text-2xl" />
                <h1 className="text-xl font-bold text-gray-900">HyphoteSys</h1>
              </div>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Biomedical Research Assistant
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={sessionCreating}>
                    <i className="fas fa-plus mr-2" />
                    New Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Research Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="session-title">Session Title (Optional)</Label>
                      <Input
                        id="session-title"
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        placeholder="Enter session title..."
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <i className="fas fa-folder-open mr-2" />
                    Load Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Load Research Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {sessions.length > 0 ? (
                      <div className="space-y-2">
                        {sessions.slice(0, 10).map((session) => (
                          <Card 
                            key={session.id}
                            className="p-3 cursor-pointer hover:bg-gray-50"
                            onClick={() => handleLoadSession(session.id)}
                          >
                            <div className="font-medium">{session.title}</div>
                            <div className="text-sm text-gray-500 truncate">
                              {session.researchQuestion}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(session.updatedAt).toLocaleString()}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No saved sessions found
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {currentSession && (
                <div className="text-sm text-gray-500">
                  Session: <span className="font-mono">{currentSession.id.slice(0, 8)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Agent Sidebar */}
        <AgentSidebar
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
          getAgentStatus={getAgentStatus}
          canExecuteAgent={canExecuteAgent}
          sessionMemory={sessionMemory}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Research Question Input */}
          <ResearchInput
            researchQuestion={researchQuestion}
            onQuestionChange={setResearchQuestion}
            onStartAnalysis={handleStartAnalysis}
            onClearAll={handleClearAll}
            isLoading={sessionCreating || isExecuting}
          />

          {/* Agent Results Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Render agent results */}
              {AGENT_CONFIGS.map((config) => {
                const result = getAgentResult(config.id);
                
                if (config.id === 'file' && !result) {
                  // Show file upload interface if file agent hasn't run
                  const thesisCompleted = getAgentStatus('thesis') === 'completed';
                  if (thesisCompleted || selectedAgent === 'file') {
                    return (
                      <FileUpload
                        key={config.id}
                        onFilesUpload={handleFileUpload}
                        onSkip={handleSkipFiles}
                        isUploading={isUploading}
                      />
                    );
                  }
                  return null;
                }
                
                if (result && result.status === 'completed') {
                  return (
                    <AgentResultComponent
                      key={result.id}
                      result={result}
                      onApprove={() => handleApproveResult(result.id)}
                      onReject={() => handleRejectResult(result.id)}
                      onRetry={() => handleRetryAgent(config.id)}
                    />
                  );
                }
                
                return null;
              })}

              {/* Placeholder for future results */}
              {currentSession && completedAgents.length < AGENT_CONFIGS.length && (
                <Card className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 text-center">
                  <i className="fas fa-cogs text-3xl text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {completedAgents.length === 0 ? 'Ready to Start' : 'Continue Analysis'}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {completedAgents.length === 0 
                      ? 'Click "Start Analysis" to begin the research workflow'
                      : `${AGENT_CONFIGS.length - completedAgents.length} agents remaining`
                    }
                  </p>
                </Card>
              )}

              {/* Research Pipeline Preview */}
              {currentSession && (
                <PipelinePreview agentResults={agentResults} />
              )}

            </div>
          </div>
        </main>
      </div>

      {/* Progress Indicator */}
      {currentSession && (
        <ProgressIndicator
          completedAgents={completedAgents}
          currentAgent={selectedAgent}
          progressPercentage={progressPercentage}
        />
      )}
    </div>
  );
}
