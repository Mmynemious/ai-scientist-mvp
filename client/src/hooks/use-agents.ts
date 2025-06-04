import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  AgentResult, 
  AgentTypeKey, 
  AGENT_CONFIGS,
  FileUploadResult 
} from "@/lib/types";

export function useAgents(sessionId: string | null) {
  const queryClient = useQueryClient();

  // Get all agent results for current session
  const { data: agentResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['/api/sessions', sessionId, 'results'],
    enabled: !!sessionId,
  });

  // Execute agent
  const executeAgentMutation = useMutation({
    mutationFn: async ({ agentType }: { agentType: AgentTypeKey }) => {
      if (!sessionId) throw new Error('No active session');
      
      const response = await apiRequest(
        'POST', 
        `/api/sessions/${sessionId}/agents/${agentType}/execute`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sessions', sessionId, 'results'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sessions', sessionId] 
      });
    }
  });

  // Upload files
  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!sessionId) throw new Error('No active session');
      
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await fetch(`/api/sessions/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }
      
      return response.json() as Promise<FileUploadResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sessions', sessionId, 'results'] 
      });
    }
  });

  // Update agent result (for user feedback)
  const updateResultMutation = useMutation({
    mutationFn: async ({ 
      resultId, 
      updates 
    }: { 
      resultId: number; 
      updates: Partial<AgentResult> 
    }) => {
      const response = await apiRequest('PUT', `/api/results/${resultId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sessions', sessionId, 'results'] 
      });
    }
  });

  // Helper functions
  const getAgentResult = (agentType: AgentTypeKey): AgentResult | null => {
    return agentResults.find((result: AgentResult) => result.agentType === agentType) || null;
  };

  const getAgentStatus = (agentType: AgentTypeKey): 'pending' | 'running' | 'completed' | 'failed' => {
    const result = getAgentResult(agentType);
    return result?.status || 'pending';
  };

  const canExecuteAgent = (agentType: AgentTypeKey): boolean => {
    if (!sessionId) return false;
    
    const config = AGENT_CONFIGS.find(c => c.id === agentType);
    if (!config) return false;
    
    // Check if all dependencies are completed
    return config.dependencies.every(dep => 
      getAgentStatus(dep) === 'completed'
    );
  };

  const getCompletedAgents = (): AgentTypeKey[] => {
    return agentResults
      .filter((result: AgentResult) => result.status === 'completed')
      .map((result: AgentResult) => result.agentType as AgentTypeKey);
  };

  const getProgressPercentage = (): number => {
    const completed = getCompletedAgents().length;
    return Math.round((completed / AGENT_CONFIGS.length) * 100);
  };

  const executeAgent = (agentType: AgentTypeKey) => {
    if (!canExecuteAgent(agentType)) {
      throw new Error(`Cannot execute ${agentType}: dependencies not met`);
    }
    
    executeAgentMutation.mutate({ agentType });
  };

  const uploadFiles = (files: File[]) => {
    uploadFilesMutation.mutate(files);
  };

  const approveResult = (resultId: number) => {
    updateResultMutation.mutate({
      resultId,
      updates: { userFeedback: 'accepted' }
    });
  };

  const rejectResult = (resultId: number) => {
    updateResultMutation.mutate({
      resultId,
      updates: { userFeedback: 'rejected' }
    });
  };

  const retryAgent = (agentType: AgentTypeKey) => {
    executeAgent(agentType);
  };

  return {
    // Data
    agentResults,
    
    // Loading states
    isLoading: resultsLoading,
    isExecuting: executeAgentMutation.isPending,
    isUploading: uploadFilesMutation.isPending,
    isUpdating: updateResultMutation.isPending,
    
    // Helper functions
    getAgentResult,
    getAgentStatus,
    canExecuteAgent,
    getCompletedAgents,
    getProgressPercentage,
    
    // Actions
    executeAgent,
    uploadFiles,
    approveResult,
    rejectResult,
    retryAgent,
    
    // Errors
    executeError: executeAgentMutation.error,
    uploadError: uploadFilesMutation.error,
    updateError: updateResultMutation.error,
  };
}
