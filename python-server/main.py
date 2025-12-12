from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import time
import logging
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

# Gofile API endpoints
GOFILE_API_BASE = "https://api.gofile.io"

@app.get("/")
async def root():
    return {"status": "ok", "message": "KTM Download API is running"}

@app.post("/api")
async def download_proxy(req: Request):
    start = time.time()
    
    try:
        body = await req.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)
    
    url = body.get("url", "")
    
    if not url:
        return JSONResponse({"error": "URL is required"}, status_code=400)
    
    # Handle Gofile URLs
    if "gofile.io/d/" in url:
        return await handle_gofile(url, start)
    
    # Handle direct download URLs (already direct links)
    if any(ext in url.lower() for ext in ['.zip', '.rar', '.7z', '.exe', '.iso']):
        elapsed = int((time.time() - start) * 1000)
        return {
            "success": True,
            "directLink": url,
            "filename": url.split("/")[-1].split("?")[0],
            "ms": elapsed
        }
    
    # For other URLs, try to return as-is
    elapsed = int((time.time() - start) * 1000)
    return {
        "success": True,
        "directLink": url,
        "ms": elapsed
    }


async def handle_gofile(url: str, start: float):
    """Handle Gofile download links"""
    
    # Extract content ID from URL
    match = re.search(r'gofile\.io/d/([a-zA-Z0-9]+)', url)
    if not match:
        return JSONResponse({"error": "Invalid Gofile URL format"}, status_code=400)
    
    content_id = match.group(1)
    logging.info(f"➡️ Gofile request | contentId={content_id}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            # Step 1: Get a guest account token
            logging.info("📝 Creating guest account...")
            account_resp = await client.post(f"{GOFILE_API_BASE}/accounts")
            
            if account_resp.status_code != 200:
                logging.error(f"❌ Failed to create account: {account_resp.status_code}")
                return JSONResponse({"error": "Failed to create Gofile account", "directLink": url}, status_code=200)
            
            account_data = account_resp.json()
            if account_data.get("status") != "ok":
                logging.error(f"❌ Account creation failed: {account_data}")
                return JSONResponse({"error": "Gofile account error", "directLink": url}, status_code=200)
            
            token = account_data.get("data", {}).get("token")
            if not token:
                logging.error("❌ No token received")
                return JSONResponse({"error": "No token received", "directLink": url}, status_code=200)
            
            logging.info(f"✅ Got token: {token[:8]}...")
            
            # Step 2: Get content info with token
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json"
            }
            
            content_url = f"{GOFILE_API_BASE}/contents/{content_id}?wt=4fd6sg89d7s6"
            logging.info(f"📥 Fetching content: {content_url}")
            
            content_resp = await client.get(content_url, headers=headers)
            
            if content_resp.status_code != 200:
                logging.error(f"❌ Content fetch failed: {content_resp.status_code} - {content_resp.text}")
                # Return original URL as fallback
                return {
                    "success": True,
                    "directLink": url,
                    "fallback": True,
                    "ms": int((time.time() - start) * 1000)
                }
            
            content_data = content_resp.json()
            
            if content_data.get("status") != "ok":
                logging.error(f"❌ Content error: {content_data}")
                return {
                    "success": True,
                    "directLink": url,
                    "fallback": True,
                    "ms": int((time.time() - start) * 1000)
                }
            
            # Step 3: Extract file info
            data = content_data.get("data", {})
            contents = data.get("children", data.get("contents", {}))
            
            if isinstance(contents, dict):
                files = list(contents.values())
            elif isinstance(contents, list):
                files = contents
            else:
                files = []
            
            if not files:
                logging.warning("❌ No files found in content")
                return {
                    "success": True,
                    "directLink": url,
                    "fallback": True,
                    "ms": int((time.time() - start) * 1000)
                }
            
            # Get the first/largest file
            file_info = files[0]
            if len(files) > 1:
                # Get the largest file
                file_info = max(files, key=lambda x: x.get("size", 0))
            
            direct_link = file_info.get("link", file_info.get("directLink", ""))
            filename = file_info.get("name", "download")
            file_size = file_info.get("size", 0)
            
            if not direct_link:
                logging.warning("❌ No direct link found")
                return {
                    "success": True,
                    "directLink": url,
                    "fallback": True,
                    "ms": int((time.time() - start) * 1000)
                }
            
            elapsed = int((time.time() - start) * 1000)
            logging.info(f"✅ Success | {filename} | {file_size} bytes | {elapsed}ms")
            
            return {
                "success": True,
                "directLink": direct_link,
                "filename": filename,
                "size": file_size,
                "ms": elapsed
            }
            
    except httpx.TimeoutException:
        logging.error("❌ Request timeout")
        return {
            "success": True,
            "directLink": url,
            "fallback": True,
            "error": "Timeout",
            "ms": int((time.time() - start) * 1000)
        }
    except Exception as e:
        logging.exception(f"🔥 Server error: {e}")
        return {
            "success": True,
            "directLink": url,
            "fallback": True,
            "error": str(e),
            "ms": int((time.time() - start) * 1000)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        log_level="info",
        reload=True
    )
