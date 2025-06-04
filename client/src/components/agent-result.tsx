import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AgentResult, AGENT_CONFIGS } from "@/lib/types";

interface AgentResultProps {
  result: AgentResult;
  onApprove: () => void;
  onReject: () => void;
  onRetry: () => void;
  isUpdating?: boolean;
}

export function AgentResultComponent({ 
  result, 
  onApprove, 
  onReject, 
  onRetry,
  isUpdating = false 
}: AgentResultProps) {
  const [showRawOutput, setShowRawOutput] = useState(false);
  
  const agentConfig = AGENT_CONFIGS.find(c => c.id === result.agentType);
  const agentName = agentConfig?.name || result.agentType;
  const agentOrder = agentConfig?.order || 0;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const renderMetadata = () => {
    if (!result.metadata) return null;

    switch (result.agentType) {
      case 'thesis':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Extracted Keywords</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.metadata.keywords?.map((keyword: string, index: number) => (
                  <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                    {keyword}
                  </Badge>
                ))}
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-3">Research Variables</h4>
              <div className="space-y-2 text-sm">
                {result.metadata.variables?.independent?.map((variable: string, index: number) => (
                  <div key={`ind-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Independent: {variable}</span>
                    <Badge variant="outline" className="text-xs">Primary</Badge>
                  </div>
                ))}
                {result.metadata.variables?.dependent?.map((variable: string, index: number) => (
                  <div key={`dep-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Dependent: {variable}</span>
                    <Badge variant="outline" className="text-xs">Primary</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Analysis Summary</h4>
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                {result.metadata.summary}
              </p>
              
              {result.warnings.length > 0 && (
                <Alert className="mb-4">
                  <i className="fas fa-exclamation-triangle text-amber-600" />
                  <AlertDescription>
                    <div className="font-medium">Considerations:</div>
                    <ul className="mt-1 text-sm">
                      {result.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );
        
      case 'search':
        return (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Found Papers</h4>
            <div className="space-y-3">
              {result.metadata.papers?.slice(0, 3).map((paper: any, index: number) => (
                <Card key={index} className="p-4">
                  <h5 className="font-medium text-gray-900 mb-2">{paper.title}</h5>
                  <p className="text-sm text-gray-600 mb-2">
                    Authors: {paper.authors?.join(', ') || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-3">{paper.abstract}</p>
                  <div className="mt-2">
                    <a 
                      href={paper.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      View Paper <i className="fas fa-external-link-alt ml-1" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
        
      default:
        return (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Results</h4>
            <p className="text-gray-700">{result.result}</p>
          </div>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-primary text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-bold">
              {agentOrder}
            </div>
            <h3 className="text-lg font-semibold">{agentName} Results</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              className={`${getConfidenceColor(result.confidence)} border-none`}
            >
              Confidence: {result.confidence}%
            </Badge>
            <i className="fas fa-check-circle text-green-300" />
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {renderMetadata()}
        
        <div className="flex space-x-2 mt-6">
          <Button 
            variant="outline" 
            onClick={onRetry}
            disabled={isUpdating}
            className="flex-1"
          >
            <i className="fas fa-redo mr-1" />
            Retry
          </Button>
          <Button 
            variant="outline" 
            onClick={onReject}
            disabled={isUpdating}
            className="flex-1"
          >
            <i className="fas fa-times mr-1" />
            Reject
          </Button>
          <Button 
            onClick={onApprove}
            disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <i className="fas fa-check mr-1" />
            Approve
          </Button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Collapsible open={showRawOutput} onOpenChange={setShowRawOutput}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
              <span>Raw Output & Metadata</span>
              <i className={`fas fa-chevron-down transition-transform ${showRawOutput ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto">
                  {JSON.stringify({
                    agent: result.agentType,
                    result: result.result,
                    confidence: result.confidence / 100,
                    sources: result.sources,
                    warnings: result.warnings,
                    timestamp: result.timestamp,
                    user_feedback: result.userFeedback,
                    metadata: result.metadata
                  }, null, 2)}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Card>
  );
}
