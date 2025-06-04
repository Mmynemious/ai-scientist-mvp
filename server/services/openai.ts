import OpenAI from "openai";
import { RichOutput } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-api-key-here"
});

export interface ThesisAnalysisResult {
  keywords: string[];
  variables: {
    independent: string[];
    dependent: string[];
    control: string[];
  };
  summary: string;
  considerations: string[];
}

export interface PaperSummaryResult {
  title: string;
  authors: string[];
  abstract: string;
  keyFindings: string[];
  methodology: string;
  relevance: number; // 0-1
}

export interface TrendAnalysisResult {
  patterns: string[];
  contradictions: string[];
  gaps: string[];
  commonVariables: string[];
}

export interface HypothesisResult {
  hypotheses: Array<{
    statement: string;
    rationale: string;
    experiments: string[];
    feasibility: number; // 0-1
  }>;
  recommendations: string[];
}

export class OpenAIService {
  async analyzeThesis(researchQuestion: string): Promise<RichOutput> {
    try {
      const prompt = `
        Analyze the following research question and extract:
        1. Key keywords and terms
        2. Research variables (independent, dependent, control)
        3. A brief summary of the research focus
        4. Any considerations or potential issues
        
        Research Question: "${researchQuestion}"
        
        Respond with JSON in this exact format:
        {
          "keywords": ["keyword1", "keyword2"],
          "variables": {
            "independent": ["var1"],
            "dependent": ["var2"], 
            "control": ["var3"]
          },
          "summary": "Brief summary of research focus",
          "considerations": ["consideration1", "consideration2"]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}") as ThesisAnalysisResult;
      
      return {
        agent: "ThesisAgent",
        result: "Successfully extracted research variables and keywords",
        confidence: 0.92,
        sources: ["OpenAI analysis"],
        warnings: result.considerations || [],
        metadata: result
      };
    } catch (error) {
      return {
        agent: "ThesisAgent", 
        result: `Error analyzing thesis: ${error.message}`,
        confidence: 0,
        sources: [],
        warnings: ["Analysis failed"],
        metadata: { error: error.message }
      };
    }
  }

  async summarizePaper(content: string, title?: string): Promise<RichOutput> {
    try {
      const prompt = `
        Summarize this research paper and extract key information:
        
        ${title ? `Title: ${title}` : ''}
        Content: ${content.substring(0, 8000)} // Limit content length
        
        Respond with JSON in this exact format:
        {
          "title": "Paper title",
          "authors": ["author1", "author2"],
          "abstract": "Paper abstract or summary",
          "keyFindings": ["finding1", "finding2"],
          "methodology": "Brief methodology description",
          "relevance": 0.8
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}") as PaperSummaryResult;
      
      return {
        agent: "ReaderAgent",
        result: `Summarized paper: ${result.title}`,
        confidence: result.relevance || 0.8,
        sources: [result.title || "Unknown paper"],
        warnings: result.relevance < 0.6 ? ["Low relevance score"] : [],
        metadata: result
      };
    } catch (error) {
      return {
        agent: "ReaderAgent",
        result: `Error summarizing paper: ${error.message}`,
        confidence: 0,
        sources: [],
        warnings: ["Summarization failed"],
        metadata: { error: error.message }
      };
    }
  }

  async analyzeTrends(summaries: PaperSummaryResult[]): Promise<RichOutput> {
    try {
      const prompt = `
        Analyze these paper summaries to identify trends, patterns, and gaps:
        
        ${summaries.map((s, i) => `
        Paper ${i + 1}: ${s.title}
        Key Findings: ${s.keyFindings.join(', ')}
        Methodology: ${s.methodology}
        `).join('\n')}
        
        Respond with JSON in this exact format:
        {
          "patterns": ["pattern1", "pattern2"],
          "contradictions": ["contradiction1"],
          "gaps": ["gap1", "gap2"],
          "commonVariables": ["variable1", "variable2"]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}") as TrendAnalysisResult;
      
      return {
        agent: "TrendAgent",
        result: `Analyzed trends across ${summaries.length} papers`,
        confidence: 0.85,
        sources: summaries.map(s => s.title),
        warnings: result.contradictions.length > 0 ? ["Contradictory findings detected"] : [],
        metadata: result
      };
    } catch (error) {
      return {
        agent: "TrendAgent",
        result: `Error analyzing trends: ${error.message}`,
        confidence: 0,
        sources: [],
        warnings: ["Trend analysis failed"],
        metadata: { error: error.message }
      };
    }
  }

  async generateHypotheses(
    researchQuestion: string, 
    trends: TrendAnalysisResult,
    variables: ThesisAnalysisResult['variables']
  ): Promise<RichOutput> {
    try {
      const prompt = `
        Generate research hypotheses and experimental suggestions based on:
        
        Research Question: ${researchQuestion}
        Identified Patterns: ${trends.patterns.join(', ')}
        Research Gaps: ${trends.gaps.join(', ')}
        Variables: ${JSON.stringify(variables)}
        
        Respond with JSON in this exact format:
        {
          "hypotheses": [
            {
              "statement": "Hypothesis statement",
              "rationale": "Why this hypothesis",
              "experiments": ["experiment1", "experiment2"],
              "feasibility": 0.8
            }
          ],
          "recommendations": ["recommendation1", "recommendation2"]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}") as HypothesisResult;
      
      return {
        agent: "HypothesisAgent",
        result: `Generated ${result.hypotheses?.length || 0} hypotheses`,
        confidence: 0.88,
        sources: ["Research analysis"],
        warnings: result.hypotheses?.some(h => h.feasibility < 0.5) ? ["Low feasibility hypotheses included"] : [],
        metadata: result
      };
    } catch (error) {
      return {
        agent: "HypothesisAgent",
        result: `Error generating hypotheses: ${error.message}`,
        confidence: 0,
        sources: [],
        warnings: ["Hypothesis generation failed"],
        metadata: { error: error.message }
      };
    }
  }
}

export const openaiService = new OpenAIService();
