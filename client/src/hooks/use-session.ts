import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { apiRequest } from "@/lib/queryClient";
import { 
  Session, 
  SessionMemory, 
  InsertSession,
  sessionMemorySchema 
} from "@/lib/types";

export function useSession() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current session
  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['/api/sessions', currentSessionId],
    enabled: !!currentSessionId,
  });

  // Get all sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/sessions'],
  });

  // Create new session
  const createSessionMutation = useMutation({
    mutationFn: async (data: { title: string; researchQuestion: string }) => {
      const sessionData: InsertSession = {
        id: nanoid(),
        title: data.title,
        researchQuestion: data.researchQuestion,
        sessionData: sessionMemorySchema.parse({
          focus: '',
          keywords: [],
          variables: {},
          paperCount: 0,
          agentProgress: {}
        })
      };

      const response = await apiRequest('POST', '/api/sessions', sessionData);
      return response.json();
    },
    onSuccess: (session: Session) => {
      setCurrentSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    }
  });

  // Update session
  const updateSessionMutation = useMutation({
    mutationFn: async (data: { 
      sessionId: string; 
      updates: Partial<InsertSession> 
    }) => {
      const response = await apiRequest('PUT', `/api/sessions/${data.sessionId}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      if (currentSessionId) {
        queryClient.invalidateQueries({ queryKey: ['/api/sessions', currentSessionId] });
      }
    }
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('DELETE', `/api/sessions/${sessionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      if (currentSessionId) {
        setCurrentSessionId(null);
      }
    }
  });

  const createSession = useCallback((title: string, researchQuestion: string) => {
    if (!researchQuestion.trim()) {
      throw new Error('Research question is required');
    }
    
    createSessionMutation.mutate({ 
      title: title || `Research Session - ${new Date().toLocaleDateString()}`,
      researchQuestion 
    });
  }, [createSessionMutation]);

  const loadSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const updateSessionMemory = useCallback((memory: SessionMemory) => {
    if (!currentSessionId) return;
    
    updateSessionMutation.mutate({
      sessionId: currentSessionId,
      updates: { sessionData: memory }
    });
  }, [currentSessionId, updateSessionMutation]);

  const deleteSession = useCallback((sessionId: string) => {
    deleteSessionMutation.mutate(sessionId);
  }, [deleteSessionMutation]);

  return {
    // State
    currentSession,
    sessions,
    currentSessionId,
    
    // Loading states
    isLoading: sessionLoading || sessionsLoading,
    isCreating: createSessionMutation.isPending,
    isUpdating: updateSessionMutation.isPending,
    isDeleting: deleteSessionMutation.isPending,
    
    // Actions
    createSession,
    loadSession,
    updateSessionMemory,
    deleteSession,
    
    // Errors
    createError: createSessionMutation.error,
    updateError: updateSessionMutation.error,
    deleteError: deleteSessionMutation.error,
  };
}
