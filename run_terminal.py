#!/usr/bin/env python3
"""
HyphoteSys Terminal Launcher
Quick launcher for the research terminal interface
"""

import subprocess
import sys
import os

def main():
    """Launch the terminal interface"""
    try:
        # Set environment variables if .env file exists
        if os.path.exists('.env'):
            from dotenv import load_dotenv
            load_dotenv()
        
        # Check for required dependencies
        try:
            import streamlit
            import openai
            import requests
        except ImportError as e:
            print(f"Missing dependency: {e}")
            print("Run: pip install streamlit openai requests python-dotenv")
            return 1
        
        # Launch CLI terminal
        from cli_terminal import main as terminal_main
        terminal_main()
        
    except KeyboardInterrupt:
        print("\nTerminal closed.")
        return 0
    except Exception as e:
        print(f"Error starting terminal: {e}")
        return 1

if __name__ == "__main__":
    exit(main())