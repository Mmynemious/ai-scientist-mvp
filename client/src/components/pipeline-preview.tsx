import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { AgentResult } from "@/lib/types";

interface PipelinePreviewProps {
  agentResults: AgentResult[];
}

export function PipelinePreview({ agentResults }: PipelinePreviewProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && mermaidRef.current) {
      // Dynamically import mermaid to avoid SSR issues
      import('mermaid').then((mermaid) => {
        mermaid.default.initialize({ 
          startOnLoad: true, 
          theme: 'default',
          themeVariables: {
            primaryColor: '#1976D2',
            primaryTextColor: '#fff',
            primaryBorderColor: '#1565C0',
            lineColor: '#424242',
            secondaryColor: '#f8f9fa',
            tertiaryColor: '#e3f2fd'
          }
        });

        const diagramDefinition = generateMermaidDiagram(agentResults);
        
        // Clear previous content
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '';
          
          // Render new diagram
          mermaid.default.render('pipeline-diagram', diagramDefinition)
            .then(({ svg }) => {
              if (mermaidRef.current) {
                mermaidRef.current.innerHTML = svg;
              }
            })
            .catch((error) => {
              console.error('Mermaid rendering error:', error);
              if (mermaidRef.current) {
                mermaidRef.current.innerHTML = `
                  <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Error rendering pipeline diagram</p>
                  </div>
                `;
              }
            });
        }
      });
    }
  }, [agentResults]);

  const generateMermaidDiagram = (results: AgentResult[]): string => {
    const completed = results
      .filter(r => r.status === 'completed')
      .map(r => r.agentType);

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
  };

  const hasResults = agentResults.length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="bg-cyan-600 text-white px-6 py-4">
        <h3 className="text-lg font-semibold">Research Pipeline Preview</h3>
      </div>
      <div className="p-6">
        {hasResults ? (
          <div 
            ref={mermaidRef} 
            className="mermaid-container bg-gray-50 rounded-lg p-4 min-h-[400px] flex items-center justify-center"
          >
            <div className="text-center text-gray-500">
              <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
              <p>Loading pipeline diagram...</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <i className="fas fa-project-diagram text-3xl mb-3"></i>
            <p>Visual pipeline will appear here after agent execution</p>
            <div className="mt-4 text-sm text-gray-400">
              Shows: Question → Variables → Papers → Analysis → Hypotheses → Experiments
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
