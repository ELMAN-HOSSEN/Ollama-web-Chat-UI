from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

app = FastAPI()

# --- Configuration ---
OLLAMA_API_URL = "http://localhost:11434/api"
# Get the absolute path of the directory where this script is located
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- API Endpoints ---
@app.get("/api/tags")
async def get_ollama_tags():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{OLLAMA_API_URL}/tags")
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Could not connect to Ollama: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)

@app.post("/api/chat")
async def chat_with_ollama(request: Request):
    try:
        data = await request.json()
        model = data.get("model", "llama3")
        messages = data.get("messages", [])

        async def stream_response():
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST", f"{OLLAMA_API_URL}/chat", json={"model": model, "messages": messages, "stream": True}
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes():
                        yield chunk

        return StreamingResponse(stream_response(), media_type="application/x-ndjson")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Static Files ---
# Mount the directory containing the script to serve static files (like style.css, script.js)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Serve the main index.html file at the root
@app.get("/")
async def read_root():
    return FileResponse(os.path.join(STATIC_DIR, 'index.html'))

# --- Server Startup ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)