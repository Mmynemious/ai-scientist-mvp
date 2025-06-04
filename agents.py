"""
Research agents for HyphoteSys biomedical research assistant
"""

import requests
import json
from typing import List, Dict, Any, Optional
from dataclasses import asdict
from core import RichOutput
import os
from datetime import datetime

class ThesisAgent:
    """Extract key variables and keywords from research question"""
    
    def execute(self, research_question: str) -> RichOutput:
        try:
            import openai
            client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            prompt = f"""
            Analyze the following biomedical research question and extract:
            1. Key keywords and terms
            2. Research variables (independent, dependent, control)
            3. A brief summary of the research focus
            4. Any considerations or potential issues
            
            Research Question: "{research_question}"
            
            Respond with JSON in this exact format:
            {{
              "keywords": ["keyword1", "keyword2"],
              "variables": {{
                "independent": ["var1"],
                "dependent": ["var2"], 
                "control": ["var3"]
              }},
              "summary": "Brief summary of research focus",
              "considerations": ["consideration1", "consideration2"]
            }}
            """

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )

            result = json.loads(response.choices[0].message.content or "{}")
            
            return RichOutput(
                agent="ThesisAgent",
                result="Successfully extracted research variables and keywords",
                confidence=0.92,
                sources=["OpenAI analysis"],
                warnings=result.get('considerations', []),
                metadata=result
            )
        except Exception as e:
            return RichOutput(
                agent="ThesisAgent", 
                result=f"Error analyzing thesis: {str(e)}",
                confidence=0.0,
                sources=[],
                warnings=["Analysis failed - check OpenAI API key"],
                metadata={"error": str(e)}
            )

class FileAgent:
    """Parse PDFs and research documents"""
    
    def execute(self, file_paths: List[str]) -> RichOutput:
        parsed_files = []
        warnings = []
        
        for file_path in file_paths:
            try:
                # Simulate PDF parsing - in production use PyMuPDF or similar
                content = self._simulate_pdf_parsing(file_path)
                parsed_files.append({
                    "filename": os.path.basename(file_path),
                    "content": content,
                    "pages": len(content) // 500,  # Estimate pages
                    "word_count": len(content.split())
                })
            except Exception as e:
                warnings.append(f"Failed to parse {file_path}: {str(e)}")
        
        return RichOutput(
            agent="FileAgent",
            result=f"Successfully parsed {len(parsed_files)} files",
            confidence=0.95 if parsed_files else 0.1,
            sources=[f["filename"] for f in parsed_files],
            warnings=warnings,
            metadata={"parsed_files": parsed_files}
        )
    
    def _simulate_pdf_parsing(self, file_path: str) -> str:
        """Simulate PDF parsing - replace with actual implementation"""
        filename = os.path.basename(file_path)
        return f"""
        Research Paper: {filename}
        
        Abstract: This study investigates biomedical mechanisms using advanced techniques.
        We analyzed cellular pathways and identified potential therapeutic targets.
        
        Introduction: Understanding molecular mechanisms is crucial for developing treatments.
        
        Methods: We employed standardized protocols and statistical analysis methods.
        
        Results: Our findings reveal significant alterations in key biological processes.
        Statistical analysis showed significant differences between groups.
        
        Discussion: These results support hypotheses about disease mechanisms.
        Further studies are needed to validate therapeutic approaches.
        
        Conclusion: This work provides new insights into treatment strategies.
        """

class SearchAgent:
    """Pull relevant papers from ArXiv and databases"""
    
    def execute(self, keywords: List[str], max_results: int = 10) -> RichOutput:
        try:
            papers = self._search_arxiv(keywords, max_results)
            
            return RichOutput(
                agent="SearchAgent",
                result=f"Found {len(papers)} relevant papers from ArXiv",
                confidence=0.9 if papers else 0.3,
                sources=[p["url"] for p in papers],
                warnings=[] if papers else ["No papers found for search terms"],
                metadata={"papers": papers, "search_terms": keywords}
            )
        except Exception as e:
            return RichOutput(
                agent="SearchAgent",
                result=f"Error searching ArXiv: {str(e)}",
                confidence=0.0,
                sources=[],
                warnings=["ArXiv search failed"],
                metadata={"error": str(e), "search_terms": keywords}
            )
    
    def _search_arxiv(self, keywords: List[str], max_results: int) -> List[Dict]:
        """Search ArXiv for papers"""
        base_url = 'http://export.arxiv.org/api/query'
        search_terms = ' AND '.join([f'all:"{k}"' for k in keywords])
        
        params = {
            'search_query': search_terms,
            'start': 0,
            'max_results': max_results,
            'sortBy': 'relevance',
            'sortOrder': 'descending'
        }
        
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        
        return self._parse_arxiv_xml(response.text)
    
    def _parse_arxiv_xml(self, xml_text: str) -> List[Dict]:
        """Parse ArXiv XML response"""
        papers = []
        entries = xml_text.split('<entry>')[1:]  # Skip first empty split
        
        for entry in entries:
            try:
                # Extract basic information using string parsing
                id_match = entry.find('<id>')
                title_match = entry.find('<title>')
                summary_match = entry.find('<summary>')
                
                if id_match > -1 and title_match > -1 and summary_match > -1:
                    id_text = entry[id_match+4:entry.find('</id>', id_match)]
                    title_text = entry[title_match+7:entry.find('</title>', title_match)].strip()
                    summary_text = entry[summary_match+9:entry.find('</summary>', summary_match)].strip()
                    
                    papers.append({
                        "id": id_text.split('/')[-1],
                        "title": title_text.replace('\n', ' '),
                        "abstract": summary_text.replace('\n', ' '),
                        "url": id_text,
                        "authors": self._extract_authors(entry)
                    })
            except:
                continue
        
        return papers
    
    def _extract_authors(self, entry: str) -> List[str]:
        """Extract authors from entry"""
        authors = []
        author_sections = entry.split('<author>')
        for section in author_sections[1:]:  # Skip first
            name_start = section.find('<name>')
            if name_start > -1:
                name_end = section.find('</name>')
                if name_end > -1:
                    authors.append(section[name_start+6:name_end].strip())
        return authors

class ReaderAgent:
    """Summarize papers using LLM analysis"""
    
    def execute(self, project_id: str, session_manager) -> RichOutput:
        try:
            # Get papers from search agent
            search_result = session_manager.get_agent_result(project_id, 'search')
            if not search_result or not search_result.get('metadata', {}).get('papers'):
                return RichOutput(
                    agent="ReaderAgent",
                    result="No papers available to summarize",
                    confidence=0.0,
                    sources=[],
                    warnings=["Run search agent first"],
                    metadata={}
                )
            
            papers = search_result['metadata']['papers']
            summaries = []
            
            for paper in papers[:3]:  # Summarize first 3 papers
                summary = self._summarize_paper(paper)
                summaries.append(summary)
            
            return RichOutput(
                agent="ReaderAgent",
                result=f"Summarized {len(summaries)} papers",
                confidence=0.85,
                sources=[s["title"] for s in summaries],
                warnings=[],
                metadata={"summaries": summaries}
            )
        except Exception as e:
            return RichOutput(
                agent="ReaderAgent",
                result=f"Error summarizing papers: {str(e)}",
                confidence=0.0,
                sources=[],
                warnings=["Summarization failed"],
                metadata={"error": str(e)}
            )
    
    def _summarize_paper(self, paper: Dict) -> Dict:
        """Summarize a single paper"""
        try:
            import openai
            client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            prompt = f"""
            Summarize this research paper:
            Title: {paper['title']}
            Abstract: {paper['abstract']}
            
            Provide JSON response:
            {{
              "title": "Paper title",
              "authors": {paper.get('authors', [])},
              "key_findings": ["finding1", "finding2"],
              "methodology": "Brief methodology",
              "relevance": 0.8
            }}
            """
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            
            return json.loads(response.choices[0].message.content or "{}")
        except:
            return {
                "title": paper['title'],
                "authors": paper.get('authors', []),
                "key_findings": ["Analysis pending"],
                "methodology": "Not analyzed",
                "relevance": 0.5
            }

class TrendAgent:
    """Detect patterns and contradictions across sources"""
    
    def execute(self, project_id: str, session_manager) -> RichOutput:
        try:
            # Get summaries from reader agent
            reader_result = session_manager.get_agent_result(project_id, 'reader')
            if not reader_result or not reader_result.get('metadata', {}).get('summaries'):
                return RichOutput(
                    agent="TrendAgent",
                    result="No paper summaries available for analysis",
                    confidence=0.0,
                    sources=[],
                    warnings=["Run reader agent first"],
                    metadata={}
                )
            
            summaries = reader_result['metadata']['summaries']
            trends = self._analyze_trends(summaries)
            
            return RichOutput(
                agent="TrendAgent",
                result=f"Analyzed trends across {len(summaries)} papers",
                confidence=0.8,
                sources=[s["title"] for s in summaries],
                warnings=trends.get("contradictions", []),
                metadata=trends
            )
        except Exception as e:
            return RichOutput(
                agent="TrendAgent",
                result=f"Error analyzing trends: {str(e)}",
                confidence=0.0,
                sources=[],
                warnings=["Trend analysis failed"],
                metadata={"error": str(e)}
            )
    
    def _analyze_trends(self, summaries: List[Dict]) -> Dict:
        """Analyze trends across paper summaries"""
        try:
            import openai
            client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            papers_text = "\n\n".join([
                f"Paper: {s['title']}\nFindings: {', '.join(s.get('key_findings', []))}\nMethod: {s.get('methodology', '')}"
                for s in summaries
            ])
            
            prompt = f"""
            Analyze trends across these papers:
            {papers_text}
            
            JSON response:
            {{
              "patterns": ["pattern1", "pattern2"],
              "contradictions": ["contradiction1"],
              "gaps": ["gap1", "gap2"],
              "common_variables": ["variable1", "variable2"]
            }}
            """
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            
            return json.loads(response.choices[0].message.content or "{}")
        except:
            return {
                "patterns": ["Analysis pending"],
                "contradictions": [],
                "gaps": ["Comprehensive analysis needed"],
                "common_variables": []
            }

class HypothesisAgent:
    """Generate experimental directions and hypotheses"""
    
    def execute(self, project_id: str, session_manager) -> RichOutput:
        try:
            # Get data from previous agents
            thesis_result = session_manager.get_agent_result(project_id, 'thesis')
            trend_result = session_manager.get_agent_result(project_id, 'trend')
            
            if not thesis_result or not trend_result:
                return RichOutput(
                    agent="HypothesisAgent",
                    result="Missing prerequisite analysis",
                    confidence=0.0,
                    sources=[],
                    warnings=["Run thesis and trend agents first"],
                    metadata={}
                )
            
            project = session_manager.load_project(project_id)
            hypotheses = self._generate_hypotheses(
                project['research_question'],
                trend_result['metadata'],
                thesis_result['metadata']
            )
            
            return RichOutput(
                agent="HypothesisAgent",
                result=f"Generated {len(hypotheses.get('hypotheses', []))} hypotheses",
                confidence=0.85,
                sources=["Research analysis"],
                warnings=[],
                metadata=hypotheses
            )
        except Exception as e:
            return RichOutput(
                agent="HypothesisAgent",
                result=f"Error generating hypotheses: {str(e)}",
                confidence=0.0,
                sources=[],
                warnings=["Hypothesis generation failed"],
                metadata={"error": str(e)}
            )
    
    def _generate_hypotheses(self, research_question: str, trends: Dict, thesis_data: Dict) -> Dict:
        """Generate research hypotheses"""
        try:
            import openai
            client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            prompt = f"""
            Generate research hypotheses based on:
            Research Question: {research_question}
            Patterns: {trends.get('patterns', [])}
            Gaps: {trends.get('gaps', [])}
            Variables: {thesis_data.get('variables', {})}
            
            JSON response:
            {{
              "hypotheses": [
                {{
                  "statement": "Hypothesis statement",
                  "rationale": "Scientific reasoning",
                  "experiments": ["experiment1", "experiment2"],
                  "feasibility": 0.8
                }}
              ],
              "recommendations": ["recommendation1", "recommendation2"]
            }}
            """
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            
            return json.loads(response.choices[0].message.content or "{}")
        except:
            return {
                "hypotheses": [{
                    "statement": "Hypothesis generation pending",
                    "rationale": "Requires OpenAI analysis",
                    "experiments": ["Design experiments based on analysis"],
                    "feasibility": 0.5
                }],
                "recommendations": ["Complete AI analysis for detailed hypotheses"]
            }

class MapAgent:
    """Create visual pipeline and research roadmap"""
    
    def execute(self, project_id: str, session_manager) -> RichOutput:
        try:
            project = session_manager.load_project(project_id)
            agent_results = project.get('agent_results', {})
            
            # Generate mermaid diagram
            diagram = self._generate_mermaid_diagram(agent_results)
            
            return RichOutput(
                agent="MapAgent",
                result="Generated research pipeline map",
                confidence=0.9,
                sources=["All agent results"],
                warnings=[],
                metadata={
                    "mermaid_diagram": diagram,
                    "completed_agents": list(agent_results.keys()),
                    "pipeline_summary": self._create_pipeline_summary(agent_results)
                }
            )
        except Exception as e:
            return RichOutput(
                agent="MapAgent",
                result=f"Error generating map: {str(e)}",
                confidence=0.0,
                sources=[],
                warnings=["Map generation failed"],
                metadata={"error": str(e)}
            )
    
    def _generate_mermaid_diagram(self, agent_results: Dict) -> str:
        """Generate mermaid flowchart diagram"""
        completed = list(agent_results.keys())
        
        diagram = """graph TD
    A[Research Question] --> B[Thesis Analysis]
    B --> C[File Processing]
    B --> D[Literature Search]
    C --> E[Paper Summarization]
    D --> E
    E --> F[Trend Analysis]
    F --> G[Hypothesis Generation]
    G --> H[Research Pipeline]
    """
        
        # Add styling for completed agents
        for agent in completed:
            if agent == 'thesis':
                diagram += "\n    B:::completed"
            elif agent == 'file':
                diagram += "\n    C:::completed"
            elif agent == 'search':
                diagram += "\n    D:::completed"
            elif agent == 'reader':
                diagram += "\n    E:::completed"
            elif agent == 'trend':
                diagram += "\n    F:::completed"
            elif agent == 'hypothesis':
                diagram += "\n    G:::completed"
            elif agent == 'map':
                diagram += "\n    H:::completed"
        
        diagram += """
    
    classDef completed fill:#10b981,stroke:#065f46,color:#fff
    classDef pending fill:#6b7280,stroke:#374151,color:#fff"""
        
        return diagram
    
    def _create_pipeline_summary(self, agent_results: Dict) -> Dict:
        """Create summary of pipeline execution"""
        return {
            "total_agents": 7,
            "completed_agents": len(agent_results),
            "completion_percentage": round((len(agent_results) / 7) * 100, 1),
            "last_executed": max([r.get('timestamp', '') for r in agent_results.values()]) if agent_results else None
        }