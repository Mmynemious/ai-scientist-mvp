import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AGENT_CONFIGS, AgentTypeKey } from "@/lib/types";

interface ProgressIndicatorProps {
  completedAgents: AgentTypeKey[];
  currentAgent: AgentTypeKey | null;
  progressPercentage: number;
}

export function ProgressIndicator({ 
  completedAgents, 
  currentAgent, 
  progressPercentage 
}: ProgressIndicatorProps) {
  const totalAgents = AGENT_CONFIGS.length;
  const completedCount = completedAgents.length;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-64 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900 text-sm">Research Progress</h4>
          <span className="text-xs text-gray-500">{completedCount} of {totalAgents}</span>
        </div>
        
        <Progress value={progressPercentage} className="h-2 mb-3" />
        
        <div className="space-y-1 text-xs">
          {AGENT_CONFIGS.slice(0, 3).map((config) => {
            const isCompleted = completedAgents.includes(config.id);
            const isCurrent = currentAgent === config.id;
            
            return (
              <div key={config.id} className="flex items-center justify-between">
                <span className={
                  isCompleted ? "text-green-600" :
                  isCurrent ? "text-primary" : "text-gray-400"
                }>
                  <i className={`mr-1 ${
                    isCompleted ? "fas fa-check-circle" :
                    isCurrent ? "fas fa-play-circle" : "fas fa-circle"
                  }`} />
                  {config.name.replace(' Agent', '')}
                </span>
                <span className="text-gray-400">
                  {isCompleted ? "Complete" :
                   isCurrent ? "Active" : "Pending"}
                </span>
              </div>
            );
          })}
          
          {totalAgents > 3 && (
            <div className="text-gray-400 pt-1 border-t border-gray-200">
              <span>
                <i className="fas fa-circle mr-1" />
                {totalAgents - Math.min(3, completedCount)} agents remaining
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
