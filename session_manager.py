"""
Session management for HyphoteSys research projects
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict

from core import RichOutput, SessionMemory, ResearcherProfile, ProjectManager

class SessionManager:
    """Manage research sessions and agent execution"""
    
    def __init__(self):
        self.project_manager = ProjectManager()
        self.sessions_file = "sessions.json"
        self._load_sessions()
    
    def _load_sessions(self):
        """Load sessions from file"""
        if os.path.exists(self.sessions_file):
            try:
                with open(self.sessions_file, 'r') as f:
                    self.sessions = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                self.sessions = {}
        else:
            self.sessions = {}
    
    def _save_sessions(self):
        """Save sessions to file"""
        with open(self.sessions_file, 'w') as f:
            json.dump(self.sessions, f, indent=2)
    
    def create_session(self, title: str, research_question: str) -> str:
        """Create a new research session"""
        session_id = str(uuid.uuid4())
        
        session_data = {
            "id": session_id,
            "title": title,
            "research_question": research_question,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "session_memory": asdict(SessionMemory()),
            "agent_results": {},
            "researcher_profile": asdict(ResearcherProfile.load())
        }
        
        self.sessions[session_id] = session_data
        self._save_sessions()
        
        # Also create project file
        project_id = self.project_manager.create_project(title, research_question)
        session_data["project_id"] = project_id
        self._save_sessions()
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        return self.sessions.get(session_id)
    
    def list_sessions(self) -> List[Dict]:
        """List all sessions"""
        sessions_list = []
        for session_id, session_data in self.sessions.items():
            sessions_list.append({
                "id": session_id,
                "title": session_data["title"],
                "research_question": session_data["research_question"],
                "updated_at": session_data["updated_at"],
                "agent_count": len(session_data.get("agent_results", {}))
            })
        
        return sorted(sessions_list, key=lambda x: x["updated_at"], reverse=True)
    
    def update_session(self, session_id: str, updates: Dict):
        """Update session data"""
        if session_id in self.sessions:
            self.sessions[session_id].update(updates)
            self.sessions[session_id]["updated_at"] = datetime.now().isoformat()
            self._save_sessions()
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            self._save_sessions()
            return True
        return False
    
    def save_agent_result(self, session_id: str, agent_name: str, result: RichOutput):
        """Save agent result to session"""
        if session_id in self.sessions:
            self.sessions[session_id]["agent_results"][agent_name] = asdict(result)
            self.sessions[session_id]["updated_at"] = datetime.now().isoformat()
            
            # Update session memory
            memory = SessionMemory(**self.sessions[session_id]["session_memory"])
            memory.last_update = datetime.now().isoformat()
            memory.agent_progress[agent_name] = "completed"
            
            # Update specific memory fields based on agent
            if agent_name == "thesis" and result.metadata:
                memory.keywords = result.metadata.get("keywords", [])
                memory.focus = result.metadata.get("summary", "")
                memory.variables = result.metadata.get("variables", {})
            elif agent_name == "search" and result.metadata:
                memory.paper_count = len(result.metadata.get("papers", []))
            
            self.sessions[session_id]["session_memory"] = asdict(memory)
            self._save_sessions()
            
            # Also save to project file
            project_id = self.sessions[session_id].get("project_id")
            if project_id:
                self.project_manager.save_agent_result(project_id, agent_name, result)
    
    def get_agent_result(self, session_id: str, agent_name: str) -> Optional[Dict]:
        """Get agent result from session"""
        if session_id in self.sessions:
            return self.sessions[session_id]["agent_results"].get(agent_name)
        return None
    
    def get_agent_results(self, session_id: str) -> Dict[str, Any]:
        """Get all agent results for session"""
        if session_id in self.sessions:
            return self.sessions[session_id]["agent_results"]
        return {}
    
    def export_session(self, session_id: str) -> Optional[Dict]:
        """Export complete session data"""
        if session_id in self.sessions:
            session_data = self.sessions[session_id].copy()
            session_data["export_timestamp"] = datetime.now().isoformat()
            session_data["export_version"] = "1.0"
            return session_data
        return None
    
    def import_session(self, session_data: Dict) -> str:
        """Import session from exported data"""
        # Generate new session ID to avoid conflicts
        new_session_id = str(uuid.uuid4())
        
        # Clean up the data
        clean_data = {
            "id": new_session_id,
            "title": f"[IMPORTED] {session_data.get('title', 'Untitled')}",
            "research_question": session_data.get("research_question", ""),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "session_memory": session_data.get("session_memory", asdict(SessionMemory())),
            "agent_results": session_data.get("agent_results", {}),
            "researcher_profile": session_data.get("researcher_profile", asdict(ResearcherProfile.load()))
        }
        
        self.sessions[new_session_id] = clean_data
        self._save_sessions()
        
        return new_session_id
    
    def load_project(self, project_id: str) -> Optional[Dict]:
        """Load project data (delegated to ProjectManager)"""
        return self.project_manager.load_project(project_id)
    
    def get_session_statistics(self, session_id: str) -> Dict:
        """Get session execution statistics"""
        if session_id not in self.sessions:
            return {}
        
        session = self.sessions[session_id]
        agent_results = session.get("agent_results", {})
        
        total_agents = 7  # thesis, file, search, reader, trend, hypothesis, map
        completed_agents = len(agent_results)
        
        confidence_scores = [
            r.get("confidence", 0) for r in agent_results.values() 
            if isinstance(r, dict) and "confidence" in r
        ]
        
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        
        return {
            "total_agents": total_agents,
            "completed_agents": completed_agents,
            "completion_percentage": round((completed_agents / total_agents) * 100, 1),
            "average_confidence": round(avg_confidence, 2),
            "last_update": session.get("updated_at", ""),
            "total_sources": sum(
                len(r.get("sources", [])) for r in agent_results.values() 
                if isinstance(r, dict)
            ),
            "total_warnings": sum(
                len(r.get("warnings", [])) for r in agent_results.values() 
                if isinstance(r, dict)
            )
        }