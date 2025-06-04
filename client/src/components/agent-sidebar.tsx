import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AGENT_CONFIGS, AgentTypeKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AgentSidebarProps {
  selectedAgent: AgentTypeKey | null;
  onAgentSelect: (agentType: AgentTypeKey) => void;
  getAgentStatus: (agentType: AgentTypeKey) => 'pending' | 'running' | 'completed' | 'failed';
  canExecuteAgent: (agentType: AgentTypeKey) => boolean;
  sessionMemory: any;
}

export function AgentSidebar({
  selectedAgent,
  onAgentSelect,
  getAgentStatus,
  canExecuteAgent,
  sessionMemory
}: AgentSidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (agentType: AgentTypeKey) => {
    const status = getAgentStatus(agentType);
    const canExecute = canExecuteAgent(agentType);
    
    if (status === 'completed') return 'Completed';
    if (status === 'running') return 'Running';
    if (status === 'failed') return 'Failed';
    if (canExecute) return 'Ready';
    return 'Waiting';
  };

  return (
    <aside className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Research Agents</h2>
        <div className="text-sm text-gray-600 mb-4">
          Execute agents step-by-step with human oversight at each stage.
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {AGENT_CONFIGS.map((config) => {
          const status = getAgentStatus(config.id);
          const canExecute = canExecuteAgent(config.id);
          const isSelected = selectedAgent === config.id;
          
          return (
            <Card
              key={config.id}
              className={cn(
                "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
                isSelected && "border-primary bg-blue-50",
                canExecute && status === 'pending' && "border-primary",
                status === 'completed' && "border-green-300 bg-green-50"
              )}
              onClick={() => onAgentSelect(config.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                    status === 'completed' ? "bg-green-500" :
                    canExecute ? "bg-primary" : "bg-gray-400"
                  )}>
                    {config.order}
                  </div>
                  <h3 className="font-semibold text-gray-900">{config.name}</h3>
                </div>
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  getStatusColor(status)
                )} />
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{config.description}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Status: <span className="font-medium">{getStatusText(config.id)}</span></span>
                <i className="fas fa-chevron-right text-gray-400" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 mb-2">Session Memory</div>
        <Card className="p-3">
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Research Focus:</span>
              <span className="font-medium truncate ml-2">
                {sessionMemory?.focus || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Papers Found:</span>
              <span className="font-medium">{sessionMemory?.paperCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="font-medium">
                {sessionMemory?.lastUpdate ? 
                  new Date(sessionMemory.lastUpdate).toLocaleTimeString() : 
                  'Never'
                }
              </span>
            </div>
          </div>
        </Card>
      </div>
    </aside>
  );
}
