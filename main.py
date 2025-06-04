#!/usr/bin/env python3
"""
HyphoteSys - AI-powered biomedical research assistant
Terminal-driven dashboard with agent workflow execution
"""

import streamlit as st
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import uuid

from core import RichOutput, SessionMemory, ResearcherProfile
from agents import (
    ThesisAgent, FileAgent, SearchAgent, ReaderAgent, 
    TrendAgent, HypothesisAgent, MapAgent
)
from session_manager import SessionManager

# Configure Streamlit
st.set_page_config(
    page_title="HyphoteSys - Research Terminal", 
    page_icon="🧪",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'session_manager' not in st.session_state:
    st.session_state.session_manager = SessionManager()
if 'current_session_id' not in st.session_state:
    st.session_state.current_session_id = None
if 'terminal_history' not in st.session_state:
    st.session_state.terminal_history = []
if 'researcher_profile' not in st.session_state:
    st.session_state.researcher_profile = ResearcherProfile.load()

def main():
    st.markdown("""
    <style>
    .main-header {
        background: linear-gradient(90deg, #312E81, #F97316);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 2.5rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 1rem;
    }
    .terminal-output {
        background-color: #1a1a1a;
        color: #00ff00;
        font-family: 'Courier New', monospace;
        padding: 1rem;
        border-radius: 5px;
        margin: 1rem 0;
        min-height: 300px;
        overflow-y: auto;
    }
    .agent-result {
        border-left: 4px solid #F97316;
        padding-left: 1rem;
        margin: 1rem 0;
    }
    .confidence-high { color: #10b981; }
    .confidence-medium { color: #f59e0b; }
    .confidence-low { color: #ef4444; }
    .warning { color: #f59e0b; font-style: italic; }
    </style>
    """, unsafe_allow_html=True)

    st.markdown('<h1 class="main-header">🧪 HyphoteSys Research Terminal</h1>', unsafe_allow_html=True)
    st.markdown("*AI-powered biomedical research assistant with agentic workflow*")

    # Sidebar for session management and profile
    with st.sidebar:
        render_sidebar()

    # Main terminal interface
    col1, col2 = st.columns([2, 1])
    
    with col1:
        render_terminal_interface()
    
    with col2:
        render_session_dashboard()

def render_sidebar():
    st.header("📋 Session Manager")
    
    # Session selection
    sessions = st.session_state.session_manager.list_sessions()
    session_options = ["Create New Session"] + [f"{s['title']} ({s['id'][:8]})" for s in sessions]
    
    selected = st.selectbox("Select Session", session_options)
    
    if selected == "Create New Session":
        with st.expander("New Session"):
            title = st.text_input("Session Title", f"Research Session {datetime.now().strftime('%Y-%m-%d')}")
            question = st.text_area("Research Question", placeholder="Enter your biomedical research question...")
            
            if st.button("Create Session") and question:
                session_id = st.session_state.session_manager.create_session(title, question)
                st.session_state.current_session_id = session_id
                st.rerun()
    else:
        session_id = sessions[session_options.index(selected) - 1]['id']
        if st.session_state.current_session_id != session_id:
            st.session_state.current_session_id = session_id
            st.rerun()

    # Researcher Profile
    st.header("👤 Researcher Profile")
    profile = st.session_state.researcher_profile
    
    with st.expander("Edit Profile"):
        profile.name = st.text_input("Name", profile.name)
        profile.email = st.text_input("Email", profile.email)
        profile.affiliation = st.text_input("Affiliation", profile.affiliation)
        profile.research_focus = st.text_area("Research Focus", profile.research_focus)
        profile.orcid = st.text_input("ORCID (Optional)", profile.orcid or "")
        
        if st.button("Save Profile"):
            profile.save()
            st.success("Profile saved!")

def render_terminal_interface():
    st.header("💻 Agent Terminal")
    
    # Terminal output display
    terminal_html = '<div class="terminal-output">'
    for entry in st.session_state.terminal_history:
        terminal_html += f'<div>{entry}</div>'
    terminal_html += '</div>'
    
    st.markdown(terminal_html, unsafe_allow_html=True)
    
    # Command input
    command = st.text_input("Terminal Command", placeholder="run thesis --query 'your research question'", key="terminal_input")
    
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        if st.button("Execute", type="primary"):
            if command:
                execute_terminal_command(command)
                st.rerun()
    
    with col2:
        if st.button("Clear Terminal"):
            st.session_state.terminal_history = []
            st.rerun()
    
    with col3:
        st.markdown("**Commands:** `run <agent>`, `view session`, `edit agent_<n>`, `export session`")

def render_session_dashboard():
    st.header("📊 Current Session")
    
    if not st.session_state.current_session_id:
        st.info("No active session. Create or select a session to begin.")
        return
    
    session = st.session_state.session_manager.get_session(st.session_state.current_session_id)
    if not session:
        st.error("Session not found")
        return
    
    st.subheader(f"📝 {session['title']}")
    st.text(f"ID: {session['id'][:8]}...")
    st.text_area("Research Question", session['research_question'], disabled=True, height=100)
    
    # Agent execution status
    st.subheader("🤖 Agent Pipeline")
    agents = ['thesis', 'file', 'search', 'reader', 'trend', 'hypothesis', 'map']
    
    for i, agent in enumerate(agents, 1):
        result = st.session_state.session_manager.get_agent_result(session['id'], agent)
        if result:
            status = "✅ Completed"
            confidence = result.get('confidence', 0)
            conf_class = "confidence-high" if confidence > 0.8 else "confidence-medium" if confidence > 0.6 else "confidence-low"
        else:
            status = "⏳ Pending"
            conf_class = ""
        
        st.markdown(f"**{i}. {agent.title()} Agent:** {status}")
        if result:
            st.markdown(f'<span class="{conf_class}">Confidence: {confidence:.1%}</span>', unsafe_allow_html=True)
    
    # Export session
    if st.button("📥 Export Session JSON"):
        export_data = st.session_state.session_manager.export_session(session['id'])
        st.download_button(
            "Download Session",
            json.dumps(export_data, indent=2),
            f"hyphotesys-session-{session['id'][:8]}.json",
            "application/json"
        )

def execute_terminal_command(command: str):
    """Execute terminal commands and update history"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    st.session_state.terminal_history.append(f"[{timestamp}] $ {command}")
    
    try:
        parts = command.strip().split()
        if not parts:
            return
        
        cmd = parts[0].lower()
        
        if cmd == "run" and len(parts) >= 2:
            agent_name = parts[1].lower()
            execute_agent(agent_name, parts[2:])
        
        elif cmd == "view" and len(parts) >= 2:
            if parts[1] == "session":
                view_session()
        
        elif cmd == "edit" and len(parts) >= 2:
            edit_agent_result(parts[1])
        
        elif cmd == "export" and len(parts) >= 2:
            if parts[1] == "session":
                export_current_session()
        
        elif cmd == "help":
            show_help()
        
        else:
            log_terminal("❌ Unknown command. Type 'help' for available commands.")
    
    except Exception as e:
        log_terminal(f"❌ Error: {str(e)}")

def execute_agent(agent_name: str, args: List[str]):
    """Execute a specific agent"""
    if not st.session_state.current_session_id:
        log_terminal("❌ No active session. Create a session first.")
        return
    
    session = st.session_state.session_manager.get_session(st.session_state.current_session_id)
    if not session:
        log_terminal("❌ Session not found.")
        return
    
    log_terminal(f"🚀 Executing {agent_name} agent...")
    
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
            log_terminal(f"❌ Unknown agent: {agent_name}")
            return
        
        agent = agent_map[agent_name]
        
        # Execute agent based on type
        if agent_name == 'thesis':
            result = agent.execute(session['research_question'])
        elif agent_name == 'search':
            # Get keywords from thesis agent result
            thesis_result = st.session_state.session_manager.get_agent_result(session['id'], 'thesis')
            if not thesis_result:
                log_terminal("❌ Run thesis agent first to extract keywords")
                return
            keywords = thesis_result.get('metadata', {}).get('keywords', [])
            result = agent.execute(keywords)
        else:
            # For other agents, pass session context
            result = agent.execute(session['id'], st.session_state.session_manager)
        
        # Save result
        st.session_state.session_manager.save_agent_result(session['id'], agent_name, result)
        
        # Display result in terminal
        display_agent_result(result)
        
    except Exception as e:
        log_terminal(f"❌ Agent execution failed: {str(e)}")

def display_agent_result(result: RichOutput):
    """Display agent result in terminal format"""
    confidence_class = "confidence-high" if result.confidence > 0.8 else "confidence-medium" if result.confidence > 0.6 else "confidence-low"
    
    log_terminal(f"✅ **{result.agent} completed**")
    log_terminal(f"📊 **Result:** {result.result}")
    log_terminal(f'🎯 **Confidence:** <span class="{confidence_class}">{result.confidence:.1%}</span>')
    
    if result.sources:
        log_terminal(f"📚 **Sources:** {', '.join(result.sources[:3])}{'...' if len(result.sources) > 3 else ''}")
    
    if result.warnings:
        for warning in result.warnings:
            log_terminal(f'⚠️ <span class="warning">Warning: {warning}</span>')

def log_terminal(message: str):
    """Add message to terminal history"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    st.session_state.terminal_history.append(f"[{timestamp}] {message}")

def view_session():
    """Display current session information"""
    if not st.session_state.current_session_id:
        log_terminal("❌ No active session.")
        return
    
    session = st.session_state.session_manager.get_session(st.session_state.current_session_id)
    log_terminal(f"📋 **Session:** {session['title']}")
    log_terminal(f"🔗 **ID:** {session['id']}")
    log_terminal(f"❓ **Question:** {session['research_question']}")

def edit_agent_result(agent_ref: str):
    """Edit agent result"""
    log_terminal(f"✏️ Edit mode for {agent_ref} - Use sidebar to modify results")

def export_current_session():
    """Export current session"""
    if not st.session_state.current_session_id:
        log_terminal("❌ No active session to export.")
        return
    
    log_terminal("📥 Session export ready - use Download button in dashboard")

def show_help():
    """Show available commands"""
    help_text = """
Available commands:
• run <agent> - Execute agent (thesis, search, reader, trend, hypothesis, map)
• view session - Show current session details
• edit agent_<n> - Edit agent result
• export session - Export session data
• help - Show this help
    """
    log_terminal(help_text)

if __name__ == "__main__":
    main()