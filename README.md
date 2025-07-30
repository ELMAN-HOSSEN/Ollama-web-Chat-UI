# Ollama Web Chat App
    2
    3 A simple, local web-based chat interface for interacting with Ollama. This application provides
      a user-friendly chat experience directly in your browser, powered by a Python backend and
      standard web technologies.
    4
    5 ## Features
    6
    7 -   **Local Chat Interface:** Interact with your local Ollama models through a clean web UI.
    8 -   **Python Backend:** Handles communication with the Ollama API.
    9 -   **Standard Web Frontend:** Built with HTML, CSS, and JavaScript for a responsive chat
      experience.
   10 -   **Easy to Run:** Includes a `start.bat` script for quick setup and launch on Windows.
   11
   12 ## Technologies Used
   13
   14 -   **Python:** For the backend server (`main.py`, `server.py`) and Ollama integration.
   15 -   **HTML:** Structures the web chat interface (`index.html`).
   16 -   **CSS:** Styles the application for a modern look and feel (`style.css`).
   17 -   **JavaScript:** Powers the frontend interactivity and communication with the backend (
      `script.js`).
   18
   19 ## Setup and Usage
   20
   21 1.  **Prerequisites:** Ensure you have Python and Ollama installed and running on your system.
   22 2.  **Dependencies:** Install the required Python packages:
      pip install -r requirements.txt
   1 3.  **Start the Application:**
   2     -   On Windows, simply run `start.bat`.
   3     -   Alternatively, you can manually run the Python server:
          python server.py
   1 4.  **Access the Chat:** Open your web browser and navigate to `http://localhost:8000` (or the
     address indicated in your console).
