#!/usr/bin/env python3
"""
HyphoteSys CLI Terminal Interface
Terminal-driven research assistant with agent execution
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional
import argparse

from core import RichOutput, SessionMemory, ResearcherProfile
from agents import (
    ThesisAgent, FileAgent, SearchAgent, ReaderAgent, 
    TrendAgent, HypothesisAgent, MapAgent
)
from session_manager import SessionManager

class HyphoteSysTerminal:
    """Terminal interface for HyphoteSys research assistant"""
    
    def __init__(self):
        self.session_manager = SessionManager()
        self.current_session_id = None
        self.researcher_profile = ResearcherProfile.load()
        
    def start(self):
        """Start the terminal interface"""
        self.print_banner()
        self.load_environment()
        
        while True:
            try:
                if self.current_session_id:
                    session = self.session_manager.get_session(self.current_session_id)
                    prompt = f"HyphoteSys[{session['title'][:20]}...]$ "
                else:
                    prompt = "HyphoteSys$ "
                
                command = input(prompt).strip()
                
                if not command:
                    continue
                    
                if command.lower() in ['exit', 'quit']:
                    print("Goodbye!")
                    break
                    
                self.execute_command(command)
                
            except KeyboardInterrupt:
                print("\nUse 'exit' to quit")
            except EOFError:
                break
    
    def print_banner(self):
        """Print application banner"""
        print("""
╔══════════════════════════════════════════════════════════════╗
║                        🧪 HyphoteSys                        ║
║              AI-Powered Biomedical Research Assistant        ║
║                     Terminal Interface v1.0                 ║
╚══════════════════════════════════════════════════════════════╝

Type 'help' for available commands or 'new session' to begin.
        """)
    
    def load_environment(self):
        """Load environment variables"""
        from dotenv import load_dotenv
        load_dotenv()
        
        if not os.getenv('OPENAI_API_KEY'):
            print("⚠️  Warning: OPENAI_API_KEY not found in environment")
            print("   Some AI features may not work without an API key")
    
    def execute_command(self, command: str):
        """Execute terminal command"""
        parts = command.strip().split()
        if not parts:
            return
        
        cmd = parts[0].lower()
        args = parts[1:]
        
        try:
            if cmd == "help":
                self.show_help()
            elif cmd == "new":
                if args and args[0] == "session":
                    self.create_new_session()
                else:
                    print("Usage: new session")
            elif cmd == "list":
                if args and args[0] == "sessions":
                    self.list_sessions()
                else:
                    print("Usage: list sessions")
            elif cmd == "load":
                if args and args[0] == "session":
                    self.load_session(args[1] if len(args) > 1 else None)
                else:
                    print("Usage: load session <session_id>")
            elif cmd == "run":
                if args:
                    self.run_agent(args[0], args[1:])
                else:
                    print("Usage: run <agent_name> [options]")
            elif cmd == "view":
                if args:
                    self.view_data(args[0], args[1:])
                else:
                    print("Usage: view <target> [options]")
            elif cmd == "export":
                if args and args[0] == "session":
                    self.export_session()
                else:
                    print("Usage: export session")
            elif cmd == "profile":
                self.manage_profile(args)
            elif cmd == "status":
                self.show_status()
            elif cmd == "clear":
                os.system('clear' if os.name == 'posix' else 'cls')
            else:
                print(f"Unknown command: {cmd}. Type 'help' for available commands.")
                
        except Exception as e:
            print(f"❌ Error executing command: {str(e)}")
    
    def show_help(self):
        """Display help information"""
        help_text = """
Available Commands:
──────────────────────────────────────────────────────────────

Session Management:
  new session              Create a new research session
  list sessions           List all saved sessions
  load session <id>       Load a specific session
  status                  Show current session status
  export session          Export current session to JSON

Agent Execution:
  run thesis              Extract variables from research question
  run search              Search ArXiv for relevant papers
  run file <path>         Parse research documents
  run reader              Summarize found papers with AI
  run trend               Analyze patterns across papers
  run hypothesis          Generate research hypotheses
  run map                 Create research pipeline visualization

Data Viewing:
  view session            Show current session details
  view results            Show all agent results
  view agent <name>       Show specific agent result
  view profile            Show researcher profile

Profile Management:
  profile edit            Edit researcher profile
  profile view            View current profile

Utilities:
  clear                   Clear terminal screen
  help                    Show this help message
  exit/quit               Exit the application

Examples:
  new session
  run thesis
  run search --max-results 15
  view agent thesis
  export session
        """
        print(help_text)
    
    def create_new_session(self):
        """Create a new research session"""
        print("\n📋 Creating New Research Session")
        print("─" * 40)
        
        title = input("Session Title: ").strip()
        if not title:
            title = f"Research Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        print("\nEnter your research question (press Enter twice to finish):")
        lines = []
        while True:
            line = input()
            if not line and lines:
                break
            lines.append(line)
        
        research_question = '\n'.join(lines).strip()
        
        if not research_question:
            print("❌ Research question is required")
            return
        
        try:
            session_id = self.session_manager.create_session(title, research_question)
            self.current_session_id = session_id
            print(f"✅ Created session: {session_id[:8]}")
            print(f"   Title: {title}")
            print(f"   Ready to execute agents!")
        except Exception as e:
            print(f"❌ Failed to create session: {str(e)}")
    
    def list_sessions(self):
        """List all research sessions"""
        sessions = self.session_manager.list_sessions()
        
        if not sessions:
            print("No sessions found. Create one with 'new session'")
            return
        
        print("\n📋 Research Sessions")
        print("─" * 80)
        print(f"{'ID':<10} {'Title':<30} {'Updated':<20} {'Agents':<8}")
        print("─" * 80)
        
        for session in sessions[:10]:  # Show last 10 sessions
            session_id = session['id'][:8]
            title = session['title'][:28] + "..." if len(session['title']) > 28 else session['title']
            updated = datetime.fromisoformat(session['updated_at']).strftime('%Y-%m-%d %H:%M')
            agent_count = session['agent_count']
            
            print(f"{session_id:<10} {title:<30} {updated:<20} {agent_count:<8}")
    
    def load_session(self, session_id: str = None):
        """Load a research session"""
        if not session_id:
            self.list_sessions()
            session_id = input("\nEnter session ID to load: ").strip()
        
        # Try to match partial ID
        sessions = self.session_manager.list_sessions()
        matching_session = None
        
        for session in sessions:
            if session['id'].startswith(session_id) or session['id'] == session_id:
                matching_session = session
                break
        
        if not matching_session:
            print(f"❌ Session not found: {session_id}")
            return
        
        self.current_session_id = matching_session['id']
        session = self.session_manager.get_session(self.current_session_id)
        
        print(f"✅ Loaded session: {session['title']}")
        print(f"   ID: {session['id'][:8]}")
        print(f"   Question: {session['research_question'][:100]}...")
    
    def run_agent(self, agent_name: str, args: List[str]):
        """Execute a research agent"""
        if not self.current_session_id:
            print("❌ No active session. Create or load a session first.")
            return
        
        session = self.session_manager.get_session(self.current_session_id)
        if not session:
            print("❌ Session not found")
            return
        
        agent_name = agent_name.lower()
        print(f"🚀 Executing {agent_name} agent...")
        
        try:
            agent_map = {
                'thesis': ThesisAgent(),
                'file': FileAgent(),
                'search': SearchAgent(),
                'reader': ReaderAgent(),
                'trend': TrendAgent(),
                'hypothesis': HypothesisAgent(),
                'map': MapAgent()
            }
            
            if agent_name not in agent_map:
                print(f"❌ Unknown agent: {agent_name}")
                print("Available agents: thesis, file, search, reader, trend, hypothesis, map")
                return
            
            agent = agent_map[agent_name]
            
            # Execute agent based on type
            if agent_name == 'thesis':
                result = agent.execute(session['research_question'])
            elif agent_name == 'search':
                # Get keywords from thesis agent
                thesis_result = self.session_manager.get_agent_result(session['id'], 'thesis')
                if not thesis_result:
                    print("❌ Run thesis agent first to extract keywords")
                    return
                keywords = thesis_result.get('metadata', {}).get('keywords', [])
                if not keywords:
                    print("❌ No keywords found in thesis analysis")
                    return
                result = agent.execute(keywords)
            elif agent_name == 'file':
                if not args:
                    print("❌ File agent requires file paths")
                    print("Usage: run file <path1> [path2] ...")
                    return
                result = agent.execute(args)
            else:
                # For other agents, pass session context
                result = agent.execute(session['id'], self.session_manager)
            
            # Save and display result
            self.session_manager.save_agent_result(session['id'], agent_name, result)
            self.display_agent_result(result)
            
        except Exception as e:
            print(f"❌ Agent execution failed: {str(e)}")
    
    def display_agent_result(self, result: RichOutput):
        """Display agent result in terminal format"""
        print("\n" + "="*60)
        print(f"🤖 {result.agent} Results")
        print("="*60)
        
        # Main result
        print(f"📊 Result: {result.result}")
        
        # Confidence with color coding
        confidence_pct = result.confidence * 100
        if confidence_pct >= 80:
            conf_indicator = "🟢"
        elif confidence_pct >= 60:
            conf_indicator = "🟡"
        else:
            conf_indicator = "🔴"
        
        print(f"🎯 Confidence: {conf_indicator} {confidence_pct:.1f}%")
        
        # Sources
        if result.sources:
            print(f"📚 Sources ({len(result.sources)}):")
            for i, source in enumerate(result.sources[:5], 1):
                print(f"   {i}. {source}")
            if len(result.sources) > 5:
                print(f"   ... and {len(result.sources) - 5} more")
        
        # Warnings
        if result.warnings:
            print("⚠️  Warnings:")
            for warning in result.warnings:
                print(f"   • {warning}")
        
        # Metadata preview
        if result.metadata:
            print("📋 Key Data:")
            for key, value in result.metadata.items():
                if isinstance(value, list) and len(value) > 3:
                    print(f"   {key}: {value[:3]} ... (+{len(value)-3} more)")
                elif isinstance(value, dict):
                    print(f"   {key}: {len(value)} items")
                else:
                    print(f"   {key}: {str(value)[:60]}...")
        
        print("="*60)
        print(f"⏰ Completed at: {result.timestamp}")
        print()
    
    def view_data(self, target: str, args: List[str]):
        """View various data types"""
        if target == "session":
            self.view_session()
        elif target == "results":
            self.view_all_results()
        elif target == "agent" and args:
            self.view_agent_result(args[0])
        elif target == "profile":
            self.view_profile()
        else:
            print("Usage: view <session|results|agent <name>|profile>")
    
    def view_session(self):
        """View current session details"""
        if not self.current_session_id:
            print("❌ No active session")
            return
        
        session = self.session_manager.get_session(self.current_session_id)
        stats = self.session_manager.get_session_statistics(self.current_session_id)
        
        print(f"\n📋 Session: {session['title']}")
        print("─" * 50)
        print(f"ID: {session['id']}")
        print(f"Created: {session['created_at']}")
        print(f"Updated: {session['updated_at']}")
        print(f"\nResearch Question:")
        print(f"{session['research_question']}")
        print(f"\n📊 Statistics:")
        print(f"Agents completed: {stats['completed_agents']}/{stats['total_agents']} ({stats['completion_percentage']}%)")
        print(f"Average confidence: {stats['average_confidence']:.1%}")
        print(f"Total sources: {stats['total_sources']}")
        print(f"Warnings: {stats['total_warnings']}")
    
    def view_all_results(self):
        """View all agent results for current session"""
        if not self.current_session_id:
            print("❌ No active session")
            return
        
        results = self.session_manager.get_agent_results(self.current_session_id)
        
        if not results:
            print("No agent results yet. Run some agents first!")
            return
        
        print(f"\n🤖 Agent Results Summary")
        print("─" * 60)
        
        agents = ['thesis', 'file', 'search', 'reader', 'trend', 'hypothesis', 'map']
        for i, agent in enumerate(agents, 1):
            result = results.get(agent)
            if result:
                confidence = result.get('confidence', 0) * 100
                status = f"✅ {confidence:.0f}%"
            else:
                status = "⏳ Pending"
            
            print(f"{i}. {agent.title():<12} {status}")
    
    def view_agent_result(self, agent_name: str):
        """View specific agent result"""
        if not self.current_session_id:
            print("❌ No active session")
            return
        
        result_data = self.session_manager.get_agent_result(self.current_session_id, agent_name.lower())
        
        if not result_data:
            print(f"❌ No result found for {agent_name} agent")
            return
        
        # Convert dict back to RichOutput for display
        result = RichOutput(**result_data)
        self.display_agent_result(result)
    
    def export_session(self):
        """Export current session to JSON"""
        if not self.current_session_id:
            print("❌ No active session to export")
            return
        
        session_data = self.session_manager.export_session(self.current_session_id)
        
        if not session_data:
            print("❌ Failed to export session")
            return
        
        filename = f"hyphotesys-session-{self.current_session_id[:8]}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(session_data, f, indent=2)
            
            print(f"✅ Session exported to: {filename}")
            print(f"   Size: {os.path.getsize(filename)} bytes")
        except Exception as e:
            print(f"❌ Export failed: {str(e)}")
    
    def manage_profile(self, args: List[str]):
        """Manage researcher profile"""
        if not args:
            print("Usage: profile <edit|view>")
            return
        
        action = args[0].lower()
        
        if action == "edit":
            self.edit_profile()
        elif action == "view":
            self.view_profile()
        else:
            print("Usage: profile <edit|view>")
    
    def edit_profile(self):
        """Edit researcher profile"""
        print("\n👤 Edit Researcher Profile")
        print("─" * 30)
        print("(Press Enter to keep current value)")
        
        profile = self.researcher_profile
        
        profile.name = input(f"Name [{profile.name}]: ").strip() or profile.name
        profile.email = input(f"Email [{profile.email}]: ").strip() or profile.email
        profile.affiliation = input(f"Affiliation [{profile.affiliation}]: ").strip() or profile.affiliation
        profile.research_focus = input(f"Research Focus [{profile.research_focus}]: ").strip() or profile.research_focus
        profile.orcid = input(f"ORCID [{profile.orcid or 'None'}]: ").strip() or profile.orcid
        
        try:
            profile.save()
            self.researcher_profile = profile
            print("✅ Profile saved successfully")
        except Exception as e:
            print(f"❌ Failed to save profile: {str(e)}")
    
    def view_profile(self):
        """View researcher profile"""
        profile = self.researcher_profile
        
        print(f"\n👤 Researcher Profile")
        print("─" * 25)
        print(f"Name: {profile.name or 'Not set'}")
        print(f"Email: {profile.email or 'Not set'}")
        print(f"Affiliation: {profile.affiliation or 'Not set'}")
        print(f"Research Focus: {profile.research_focus or 'Not set'}")
        print(f"ORCID: {profile.orcid or 'Not set'}")
        print(f"Created: {profile.created_at}")
    
    def show_status(self):
        """Show current status"""
        print(f"\n🔍 HyphoteSys Status")
        print("─" * 25)
        
        # Environment
        openai_key = "✅" if os.getenv('OPENAI_API_KEY') else "❌"
        print(f"OpenAI API Key: {openai_key}")
        
        # Session info
        if self.current_session_id:
            session = self.session_manager.get_session(self.current_session_id)
            stats = self.session_manager.get_session_statistics(self.current_session_id)
            print(f"Active Session: {session['title'][:30]}")
            print(f"Progress: {stats['completion_percentage']}% ({stats['completed_agents']}/7 agents)")
        else:
            print("Active Session: None")
        
        # Profile
        profile_status = "✅" if self.researcher_profile.name else "❌"
        print(f"Researcher Profile: {profile_status}")
        
        # Sessions count
        total_sessions = len(self.session_manager.list_sessions())
        print(f"Total Sessions: {total_sessions}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='HyphoteSys Terminal Interface')
    parser.add_argument('--version', action='version', version='HyphoteSys 1.0')
    args = parser.parse_args()
    
    terminal = HyphoteSysTerminal()
    terminal.start()

if __name__ == "__main__":
    main()