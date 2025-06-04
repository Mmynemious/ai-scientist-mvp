# 🧠 AI Scientist MVP

An AI-powered assistant for biomedical researchers to accelerate literature review, hypothesis generation, and experiment design using a modular, agent-based workflow.

---

## 🚀 Features

### 🧬 Core Functionality
- **Agentic Workflow**: Step-by-step execution of domain-specific AI agents
- **Human-Centered Collaboration**: Accept, edit, retry, or inspect each agent’s output
- **Research Question Parsing**: Extracts core variables from user input
- **Paper Search & Summarization**: Pulls papers from ArXiv and summarizes them using LLM (stubbed)
- **Pattern & Trend Analysis**: Identifies common themes and gaps in literature
- **Hypothesis Generation**: Generates testable research ideas and experimental flows
- **Pipeline Mapping**: Outputs a structured Markdown-style hypothesis outline

### 📁 Session Management
- `SessionMemory` class to persist data across agents
- Project saving system: saves each session to `projects/{uuid}.json`
- Resume/edit functionality coming soon

---

## 🧠 Agents Overview

| Agent             | Role                                              |
|------------------|---------------------------------------------------|
| `ThesisAgent`     | Extracts variables from a research question       |
| `FileAgent`       | Parses PDFs or CSV files                          |
| `SearchAgent`     | Fetches recent literature from ArXiv              |
| `ReaderAgent`     | Summarizes selected paper content (LLM stub)      |
| `TrendAgent`      | Identifies common variables, contradictions       |
| `HypothesisAgent` | Suggests potential research hypotheses            |
| `MapAgent`        | Outlines the proposed pipeline in logical format  |

---

## 🧰 Technology Stack

- **Language**: Python
- **CLI UI**: input() based terminal interface
- **LLM (optional)**: OpenAI or OpenRouter (future integration)
- **PDF Parser**: PyMuPDF (`fitz`)
- **Web Search**: ArXiv API via `requests`
- **Persistence**: `uuid`, `json`-based local project storage

---

## 📦 Project Structure

ai-scientist-mvp/
├── main.py # CLI runner and menu logic
├── agents.py # All modular agent classes
├── core.py # SessionMemory and RichOutput utilities
├── projects/ # Saved research sessions


---

## 🧑‍🔬 Usage

### Run Locally:
```bash
pip install requests pymupdf
python main.py
