#!/usr/bin/env python3
"""
Reference Refinement v6.0 - Backend Server
FastAPI backend for client/server mode operation
"""

import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from urllib.parse import urlparse

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, HttpUrl
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Reference Refinement Backend",
    description="Backend API for Reference Refinement v6.0",
    version="6.0.0"
)

# CORS configuration - allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CX = os.getenv("GOOGLE_CX")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Validate configuration
if not all([GOOGLE_API_KEY, GOOGLE_CX, OPENAI_API_KEY]):
    logger.warning("Missing required environment variables. Some features may not work.")

# HTTP client with timeout and retries
http_client = httpx.AsyncClient(
    timeout=30.0,
    follow_redirects=True,
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
)

# ============================================================================
# Pydantic Models
# ============================================================================

class HealthResponse(BaseModel):
    ok: bool
    version: str
    timestamp: str
    mode: str = "client-server"

class GoogleSearchRequest(BaseModel):
    query: str
    num_results: int = Field(default=10, ge=1, le=10)

class GoogleSearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    domain: str

class GoogleSearchResponse(BaseModel):
    query: str
    results: List[GoogleSearchResult]
    error: Optional[str] = None

class LLMChatRequest(BaseModel):
    prompt: str
    model: str = Field(default="gpt-4o-mini")
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=1000, ge=1, le=4000)

class LLMChatResponse(BaseModel):
    result: str
    model: str
    tokens_used: Optional[int] = None
    error: Optional[str] = None

class Reference(BaseModel):
    title: str
    authors: str
    year: str
    publication: Optional[str] = None

class SearchCandidate(BaseModel):
    title: str
    url: str
    snippet: str
    score: Optional[float] = None

class LLMRankRequest(BaseModel):
    reference: Reference
    candidates: List[SearchCandidate]
    max_results: int = Field(default=5, ge=1, le=10)

class RankedCandidate(BaseModel):
    url: str
    title: str
    score: float
    reasoning: Optional[str] = None

class LLMRankResponse(BaseModel):
    ranked: List[RankedCandidate]
    error: Optional[str] = None

class URLResolveRequest(BaseModel):
    urls: List[str]
    check_content: bool = Field(default=False)

class URLStatus(BaseModel):
    url: str
    status: str  # "success", "redirect", "error"
    final_url: Optional[str] = None
    status_code: Optional[int] = None
    error_message: Optional[str] = None

class URLResolveResponse(BaseModel):
    results: List[URLStatus]

class ProxyFetchRequest(BaseModel):
    url: str
    headers: Optional[Dict[str, str]] = None

class ProxyFetchResponse(BaseModel):
    content: str
    status_code: int
    headers: Dict[str, str]
    error: Optional[str] = None

# ============================================================================
# Utility Functions
# ============================================================================

def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        parsed = urlparse(url)
        return parsed.netloc or parsed.path
    except:
        return url

async def check_url_status(url: str) -> URLStatus:
    """Check if a URL is accessible"""
    try:
        response = await http_client.head(url, follow_redirects=True)
        return URLStatus(
            url=url,
            status="redirect" if str(response.history) else "success",
            final_url=str(response.url) if response.history else url,
            status_code=response.status_code
        )
    except httpx.HTTPStatusError as e:
        return URLStatus(
            url=url,
            status="error",
            status_code=e.response.status_code if e.response else None,
            error_message=str(e)
        )
    except Exception as e:
        return URLStatus(
            url=url,
            status="error",
            error_message=str(e)
        )

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Reference Refinement Backend",
        "version": "6.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        ok=True,
        version="v6.0",
        timestamp=datetime.utcnow().isoformat(),
        mode="client-server"
    )

@app.post("/api/search/google", response_model=GoogleSearchResponse)
async def search_google(request: GoogleSearchRequest):
    """Search Google using Custom Search API"""
    
    if not GOOGLE_API_KEY or not GOOGLE_CX:
        return GoogleSearchResponse(
            query=request.query,
            results=[],
            error="Google Search API not configured"
        )
    
    try:
        # Build Google CSE request
        params = {
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_CX,
            "q": request.query,
            "num": request.num_results
        }
        
        # Make API request
        response = await http_client.get(
            "https://www.googleapis.com/customsearch/v1",
            params=params
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Parse results
        results = []
        for item in data.get("items", []):
            results.append(GoogleSearchResult(
                title=item.get("title", ""),
                url=item.get("link", ""),
                snippet=item.get("snippet", ""),
                domain=extract_domain(item.get("link", ""))
            ))
        
        return GoogleSearchResponse(
            query=request.query,
            results=results
        )
        
    except httpx.HTTPStatusError as e:
        logger.error(f"Google Search API error: {e}")
        return GoogleSearchResponse(
            query=request.query,
            results=[],
            error=f"API error: {e.response.status_code}"
        )
    except Exception as e:
        logger.error(f"Google Search error: {e}")
        return GoogleSearchResponse(
            query=request.query,
            results=[],
            error=str(e)
        )

@app.post("/api/llm/chat", response_model=LLMChatResponse)
async def llm_chat(request: LLMChatRequest):
    """Chat with OpenAI LLM"""
    
    if not OPENAI_API_KEY:
        return LLMChatResponse(
            result="",
            model=request.model,
            error="OpenAI API not configured"
        )
    
    try:
        # Make OpenAI API request
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": request.model,
            "messages": [
                {"role": "system", "content": "You are a helpful research assistant."},
                {"role": "user", "content": request.prompt}
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        }
        
        response = await http_client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        
        data = response.json()
        
        return LLMChatResponse(
            result=data["choices"][0]["message"]["content"],
            model=request.model,
            tokens_used=data.get("usage", {}).get("total_tokens")
        )
        
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenAI API error: {e}")
        error_detail = "API error"
        try:
            error_data = e.response.json()
            error_detail = error_data.get("error", {}).get("message", str(e))
        except:
            error_detail = f"Status code: {e.response.status_code}"
        return LLMChatResponse(
            result="",
            model=request.model,
            error=error_detail
        )
    except Exception as e:
        logger.error(f"LLM chat error: {e}")
        return LLMChatResponse(
            result="",
            model=request.model,
            error=str(e)
        )

@app.post("/api/llm/rank", response_model=LLMRankResponse)
async def llm_rank(request: LLMRankRequest):
    """Rank search candidates using LLM"""
    
    if not OPENAI_API_KEY:
        return LLMRankResponse(
            ranked=[],
            error="OpenAI API not configured"
        )
    
    try:
        # Build ranking prompt
        prompt = f"""Given the following academic reference, rank the search results by how likely they are to be the correct source.

Reference:
- Title: {request.reference.title}
- Authors: {request.reference.authors}
- Year: {request.reference.year}
- Publication: {request.reference.publication or 'Unknown'}

Search Results:
"""
        for i, candidate in enumerate(request.candidates, 1):
            prompt += f"\n{i}. {candidate.title}\n   URL: {candidate.url}\n   Snippet: {candidate.snippet}\n"
        
        prompt += f"\n\nReturn the top {request.max_results} most likely matches as a JSON array with this format:\n"
        prompt += '[{"url": "...", "title": "...", "score": 0.95, "reasoning": "..."}, ...]'
        prompt += "\n\nThe score should be between 0 and 1, with 1 being a perfect match."
        
        # Call OpenAI
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are an expert at identifying academic references. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 1000
        }
        
        response = await http_client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        
        data = response.json()
        result_text = data["choices"][0]["message"]["content"]
        
        # Parse JSON response
        try:
            # Extract JSON from the response (in case there's extra text)
            import re
            json_match = re.search(r'\[.*\]', result_text, re.DOTALL)
            if json_match:
                ranked_data = json.loads(json_match.group())
            else:
                ranked_data = json.loads(result_text)
            
            ranked = []
            for item in ranked_data[:request.max_results]:
                ranked.append(RankedCandidate(
                    url=item.get("url", ""),
                    title=item.get("title", ""),
                    score=float(item.get("score", 0)),
                    reasoning=item.get("reasoning")
                ))
            
            # Sort by score descending
            ranked.sort(key=lambda x: x.score, reverse=True)
            
            return LLMRankResponse(ranked=ranked)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM ranking response: {e}")
            # Fallback: return candidates in order
            ranked = []
            for i, candidate in enumerate(request.candidates[:request.max_results]):
                ranked.append(RankedCandidate(
                    url=candidate.url,
                    title=candidate.title,
                    score=1.0 - (i * 0.1),
                    reasoning="Fallback ranking"
                ))
            return LLMRankResponse(ranked=ranked)
        
    except Exception as e:
        logger.error(f"LLM ranking error: {e}")
        return LLMRankResponse(
            ranked=[],
            error=str(e)
        )

@app.post("/api/resolve/urls", response_model=URLResolveResponse)
async def resolve_urls(request: URLResolveRequest):
    """Check if URLs are accessible and resolve redirects"""
    
    try:
        # Check URLs concurrently
        tasks = [check_url_status(url) for url in request.urls]
        results = await asyncio.gather(*tasks)
        
        return URLResolveResponse(results=results)
        
    except Exception as e:
        logger.error(f"URL resolution error: {e}")
        # Return error status for all URLs
        results = [
            URLStatus(url=url, status="error", error_message=str(e))
            for url in request.urls
        ]
        return URLResolveResponse(results=results)

@app.get("/api/proxy/fetch", response_model=ProxyFetchResponse)
async def proxy_fetch(url: str):
    """Fetch content from a URL (proxy for CORS bypass)"""
    
    try:
        response = await http_client.get(url)
        response.raise_for_status()
        
        return ProxyFetchResponse(
            content=response.text,
            status_code=response.status_code,
            headers=dict(response.headers)
        )
        
    except httpx.HTTPStatusError as e:
        return ProxyFetchResponse(
            content="",
            status_code=e.response.status_code if e.response else 500,
            headers={},
            error=str(e)
        )
    except Exception as e:
        return ProxyFetchResponse(
            content="",
            status_code=500,
            headers={},
            error=str(e)
        )

@app.post("/api/finalize_v50")
async def finalize_enhanced_master(request: Request):
    """Create enhanced_master_v50.txt from decisions.txt"""
    
    try:
        data = await request.json()
        decisions_content = data.get("content", "")
        
        # Process decisions to create enhanced master
        # This is a placeholder - implement the actual logic based on v5.5
        enhanced_content = f"# Enhanced Master v5.0\n# Generated: {datetime.now().isoformat()}\n\n"
        enhanced_content += decisions_content
        
        # In production, save to file system
        # For now, return the processed content
        return JSONResponse(content={
            "success": True,
            "content": enhanced_content,
            "message": "Enhanced master file created"
        })
        
    except Exception as e:
        logger.error(f"Finalization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

# ============================================================================
# Startup and Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Reference Refinement Backend v6.0 starting...")
    logger.info(f"CORS enabled for all origins (development mode)")
    
    # Check configuration
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set - search features disabled")
    if not GOOGLE_CX:
        logger.warning("GOOGLE_CX not set - search features disabled")
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set - LLM features disabled")
    
    logger.info("Backend ready at http://127.0.0.1:8000")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down backend...")
    await http_client.aclose()

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    # Run with uvicorn
    uvicorn.run(
        "backend_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )
