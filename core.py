"""
Core data structures and utilities for HyphoteSys
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
import json
import os
from datetime import datetime

@dataclass
class RichOutput:
    """Standardized output format for all agents"""
    agent: str
    result: str
    confidence: float  # 0.0 to 1.0
    sources: List[str]
    warnings: List[str]
    metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

@dataclass
class SessionMemory:
    """Persistent memory shared across agents"""
    focus: str = ""
    keywords: List[str] = None
    variables: Dict[str, Any] = None
    paper_count: int = 0
    last_update: str = ""
    agent_progress: Dict[str, str] = None
    
    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.variables is None:
            self.variables = {}
        if self.agent_progress is None:
            self.agent_progress = {}

@dataclass
class ResearcherProfile:
    """Researcher profile for auto-filling inputs"""
    name: str = ""
    email: str = ""
    affiliation: str = ""
    research_focus: str = ""
    orcid: Optional[str] = None
    pubmed_id: Optional[str] = None
    created_at: str = ""
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
    
    @classmethod
    def load(cls) -> 'ResearcherProfile':
        """Load profile from profile.json"""
        if os.path.exists('profile.json'):
            try:
                with open('profile.json', 'r') as f:
                    data = json.load(f)
                return cls(**data)
            except (json.JSONDecodeError, TypeError):
                pass
        return cls()
    
    def save(self):
        """Save profile to profile.json"""
        with open('profile.json', 'w') as f:
            json.dump(asdict(self), f, indent=2)

class ProjectManager:
    """Manage project sessions in projects/ directory"""
    
    def __init__(self, projects_dir: str = "projects"):
        self.projects_dir = projects_dir
        os.makedirs(projects_dir, exist_ok=True)
    
    def create_project(self, title: str, research_question: str) -> str:
        """Create new project session"""
        project_id = f"project-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        project_data = {
            "id": project_id,
            "title": title,
            "research_question": research_question,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "session_memory": asdict(SessionMemory()),
            "agent_results": {},
            "researcher_profile": asdict(ResearcherProfile.load())
        }
        
        filepath = os.path.join(self.projects_dir, f"{project_id}.json")
        with open(filepath, 'w') as f:
            json.dump(project_data, f, indent=2)
        
        return project_id
    
    def load_project(self, project_id: str) -> Optional[Dict]:
        """Load project by ID"""
        filepath = os.path.join(self.projects_dir, f"{project_id}.json")
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
        return None
    
    def save_project(self, project_data: Dict):
        """Save project data"""
        project_data["updated_at"] = datetime.now().isoformat()
        filepath = os.path.join(self.projects_dir, f"{project_data['id']}.json")
        with open(filepath, 'w') as f:
            json.dump(project_data, f, indent=2)
    
    def list_projects(self) -> List[Dict]:
        """List all projects"""
        projects = []
        for filename in os.listdir(self.projects_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(self.projects_dir, filename)
                try:
                    with open(filepath, 'r') as f:
                        project = json.load(f)
                        projects.append({
                            "id": project["id"],
                            "title": project["title"],
                            "updated_at": project["updated_at"],
                            "research_question": project["research_question"][:100] + "..." if len(project["research_question"]) > 100 else project["research_question"]
                        })
                except (json.JSONDecodeError, KeyError):
                    continue
        
        return sorted(projects, key=lambda x: x["updated_at"], reverse=True)
    
    def save_agent_result(self, project_id: str, agent_name: str, result: RichOutput):
        """Save agent result to project"""
        project = self.load_project(project_id)
        if project:
            project["agent_results"][agent_name] = asdict(result)
            self.save_project(project)
    
    def get_agent_result(self, project_id: str, agent_name: str) -> Optional[Dict]:
        """Get agent result from project"""
        project = self.load_project(project_id)
        if project:
            return project["agent_results"].get(agent_name)
        return None