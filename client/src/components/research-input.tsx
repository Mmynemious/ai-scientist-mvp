import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface ResearchInputProps {
  researchQuestion: string;
  onQuestionChange: (question: string) => void;
  onStartAnalysis: () => void;
  onClearAll: () => void;
  isLoading?: boolean;
}

export function ResearchInput({
  researchQuestion,
  onQuestionChange,
  onStartAnalysis,
  onClearAll,
  isLoading = false
}: ResearchInputProps) {
  const handleStartAnalysis = () => {
    if (researchQuestion.trim()) {
      onStartAnalysis();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-6">
      <div className="max-w-4xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Research Question</h2>
        <div className="flex space-x-4">
          <div className="flex-1">
            <Textarea
              value={researchQuestion}
              onChange={(e) => onQuestionChange(e.target.value)}
              placeholder="Enter your research question here... e.g., 'How does mitochondrial dysfunction contribute to neurodegeneration in Alzheimer's disease models derived from iPSCs?'"
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleStartAnalysis}
              disabled={!researchQuestion.trim() || isLoading}
              className="px-6 py-3"
            >
              <i className="fas fa-play mr-2" />
              {isLoading ? 'Starting...' : 'Start Analysis'}
            </Button>
            <Button 
              variant="outline"
              onClick={onClearAll}
              disabled={isLoading}
              className="px-6 py-3"
            >
              <i className="fas fa-refresh mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
