# Multi-Agent CO-PO Agentic Platform

An agentic AI pipeline designed to automate the process of Course Outcomes (CO) generation, Program Outcomes (PO) mapping, and attainment calculations for NBA/NAAC Accreditation. It leverages Groq's fast LLM models to dynamically generate outcomes, map them intelligently, and analyze student performance marks.

## Features

- **Automated CO Generation**: Extracts context from a provided syllabus (PDF/TXT) and automatically generates targeted Course Outcomes using Bloom's Taxonomy.
- **Intelligent Validation & Reflection**: Multi-agent system critiques the generated COs and PO mappings, iterating via user feedback until the outputs meet academic standards.
- **Dynamic CO-PO Mapping**: Evaluates the strength of correlations between COs and POs (levels 1, 2, 3).
- **Attainment Calculation**: Ingests student marks via CSV to calculate the final attainment percentage for each CO and PO based on user-defined thresholds.
- **Excel Report Export**: Generates a finalized Excel report containing the complete mapping matrix and attainment results.

## Prerequisites

- **Python 3.8+**
- **Groq API Key**: Needed to power the LLM agents. You can get one from the [Groq Console](https://console.groq.com/).

## Installation

1. **Clone the repository** and navigate to the project directory:
   ```bash
   cd "path/to/agentic_atharv"
   ```

2. **Navigate to the application folder**:
   ```bash
   cd CO_PO
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirement.txt
   ```

4. **Environment Variables**:
   Create a `.env` file inside the `CO_PO` directory and add your Groq API Key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

## How to Run

1. Make sure you are in the `CO_PO` directory.
2. Run the main orchestrator script:
   ```bash
   python main.py
   ```

3. Follow the interactive terminal prompts:
   - **Phase 1 (Setup)**: Enter the subject name, year of study, and the path to your syllabus file (e.g., `data/syllabus/dbms_syllabus.pdf`). Set your CO attainment thresholds (e.g., 55%, 65%, 75%).
   - **Phase 2 (CO Generation)**: Choose how many COs to generate. Review the AI-generated outcomes and either approve them or provide feedback for regeneration.
   - **Phase 3 (PO Input)**: Load Program Outcomes from a file (e.g., `data/sample_pos.json`) or type them manually.
   - **Phase 4 (Mapping)**: The system will automatically map COs to POs and validate them.
   - **Phase 5 (Teaching Philosophy)**: The system generates a teaching philosophy based on your syllabus.
   - **Phases 6 & 7 (Attainment)**: Provide the path to your students' marks (e.g., `data/students/sample_marks.csv`) to calculate final attainments.
   - **Phases 8 & 9 (Reporting)**: View AI recommendations to improve your course delivery and export the final comprehensive data to an Excel report.

## Project Structure

- `CO_PO/main.py`: The entry point that orchestrates the entire multi-agent workflow.
- `CO_PO/core/`: Contains the central `Orchestrator` class and state definitions.
- `CO_PO/agents/`: Individual AI agents responsible for generation, mapping, validation, and reflection.
- `CO_PO/data/`: Default location for inputs like syllabus files (`.pdf`), student marks (`.csv`), and PO configurations (`.json`).
- `CO_PO/tools/`: Helper utilities such as syllabus parsing tools.
