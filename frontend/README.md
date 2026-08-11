# Divyam AI Frontend

A lightweight ChatGPT-style frontend for the FastAPI resume assistant.

## 1. Run locally

You can simply serve this folder with a local static server.

If Python is installed:

```bash
python -m http.server 5500
```

Then open:

http://localhost:5500

Make sure your FastAPI backend is running at:

http://127.0.0.1:8000

## 2. Connect your deployed backend

Open `config.js` and change:

```js
API_BASE_URL: "http://127.0.0.1:8000"
```

to your deployed FastAPI URL, for example:

```js
API_BASE_URL: "https://your-app.onrender.com"
```

Do not put your Groq API key anywhere in this frontend.

## 3. Deploy

This is a static website, so it can be deployed free on Vercel, Netlify, or GitHub Pages.

For Vercel:
- Import the GitHub repository.
- Set the project root to this frontend folder if needed.
- No build command is required.
- Deploy.

## Important backend change

Because the frontend and FastAPI backend will be on different domains, FastAPI needs CORS.

Add:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "https://YOUR-FRONTEND-DOMAIN.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

During early testing you can temporarily use `allow_origins=["*"]`, but restrict it to your actual frontend domain before the final deployment.

## Current backend behavior

The frontend expects:

POST /chat

Request:

```json
{
  "question": "Tell me about yourself."
}
```

Response:

```json
{
  "answer": "..."
}
```

This matches the FastAPI code supplied for the project.

## One backend performance improvement

Your current `/chat` endpoint reads and parses the PDF and calls the resume parser on every question. That means one HR question causes:

PDF read -> resume parsing LLM call -> candidate answer LLM call

This will be noticeably slower and will consume two LLM calls per question.

For the final version, parse the resume once at application startup and reuse the resulting `Resume` object in `/chat`.
