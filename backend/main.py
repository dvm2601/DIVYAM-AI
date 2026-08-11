import os
from fastapi import FastAPI
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel
from pypdf import PdfReader
from groq import Groq
import json
from fastapi.middleware.cors import CORSMiddleware

my_api_key = os.getenv("GROQ_API_KEY") # step 3- load api key from env into a variable
if not my_api_key: 
    raise ValueError("API KEY KAHA HAI BHAI?")

client = Groq(api_key=my_api_key) # step 4- register as a client, set model, role and content
model = "llama-3.3-70b-versatile"

class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = []

class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None

    total_experience_years: float | None = None

    skills: list[str] = []
    experiences: list[Experience] = []
    education: list[str] = []
    projects: list[str] = []
    certifications: list[str] = []

resume_schema = Resume.model_json_schema()

class ChatRequest(BaseModel):
    question: str

def ask_candidate(question: str, resume: Resume):

    system_prompt = f"""
You are an AI assistant representing a job candidate.

Below is everything you know about the candidate.

{resume.model_dump_json(indent=2)}

Rules:

1. Answer only using this information.

2. Never hallucinate.

3. If information is unavailable,
say

"I don't have enough information to answer that."

4. Be professional.

5. Answer as if HR is interviewing this candidate.
"""

    response = client.chat.completions.create(

        model=model,

        messages=[

            {
                "role":"system",
                "content":system_prompt
            },

            {
                "role":"user",
                "content":question
            }

        ]

    )

    return response.choices[0].message.content

def parse_resume(resume_text): #this function takes in a resume ka string format and gets a json made from the llm
    system_prompt = f"""
    You are an expert resume parser.

    Extract information from the resume based on its meaning,
    not only based on exact section headings.

    Different resumes may use different headings.

    For example:
    - Experience
    - Professional Experience
    - Work History
    - Employment
    - Internships

    These may all contain relevant experience.

    Skills may also appear in the skills section, work experience,
    internships or projects.

    Return ONLY valid JSON matching this schema:

    {resume_schema}

    Important rules:

    1. Do not invent information.
    2. If a value is not available, return null.
    3. If a list has no information, return an empty list.
    4. Include internships inside experiences.
    5. Extract skills mentioned across the entire resume.
    """
    user_prompt = f"""
    Parse the following resume:

    {resume_text}
    """
    message_system={
        "role" : "system",
        "content" : system_prompt
    }
    message_user={
        "role" : "user",
        "content" : user_prompt
    }
    messages=[message_system, message_user]
    response_format={
        "type": "json_object"
    }
    response=client.chat.completions.create(model=model, messages=messages, response_format=response_format)
    raw_output = response.choices[0].message.content
    data = json.loads(raw_output)
    resume = Resume(**data)
    return resume

resume = None  # Global variable to store the parsed resume

#pdf extraction
def read_pdf(file_path):
    reader = PdfReader(file_path) #Creates a PdfReader object. Now reader has access to everything inside the PDF.
    text = ""

    for page in reader.pages: #reader.pages is a list of all the pages in the PDF. This for each loop iterates from that list and copies all the content of pages to the text variable.           
        page_text = page.extract_text() #Reads all the text from the current page.
        if page_text:
            text += page_text + "\n"
    return text


app = FastAPI() #step 1- create a fastapi app
# Add this block to allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
     allow_origins=[
        "https://divyam-ai-eight.vercel.app/"
    ], # In production, replace "*" with your actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# jab website khule to sabse pehle ye show hoga. aapka homepage hai
@app.get("/")
def home():
    return {
        "message": "Resume assistant is running"
    }

@app.on_event("startup")
def load_resume():
    global resume

    resume_text = read_pdf(Path("resume latest aug 6.pdf"))
    resume = parse_resume(resume_text)

    print("Resume parsed successfully!")

@app.post("/chat")
def chat(request: ChatRequest):
    answer = ask_candidate(request.question, resume)

    return {
        "answer": answer
    }