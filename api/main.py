"""Ninoo's same-origin API bridge to the existing Second Look service.

No database, model worker, or provider credentials live here. Ninoo publishes
this FastAPI entrypoint at /api; the existing Node service remains authoritative.
"""
import os
import re
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

app = FastAPI()
UPSTREAM = "https://x1cloud.tail6fbca0.ts.net"
SESSION_COOKIE = "__Host-second-look"
MAX_BODY = 20 * 1024


def allowed_origin(request: Request) -> bool:
    origin = request.headers.get("origin", "")
    configured = os.environ.get("NINOO_APP_ORIGIN")
    if configured:
        return origin == configured.rstrip("/")
    parsed = urlsplit(origin)
    return (
        parsed.scheme == "https"
        and parsed.netloc == request.headers.get("host")
        and not parsed.path
        and not parsed.query
        and not parsed.fragment
    )


@app.api_route("/api/{path:path}", methods=["GET", "POST"])
async def bridge(path: str, request: Request) -> Response:
    if not (
        path in {"health", "providers", "session", "session/login", "session/logout", "session/role", "case"}
        or path.startswith("case/")
        or path.startswith("research/")
    ):
        return JSONResponse({"error": "Unknown app endpoint."}, status_code=404)
    if request.method == "POST" and (
        not allowed_origin(request)
        or request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json"
    ):
        return JSONResponse({"error": "Use this app with a same-origin JSON request."}, status_code=403)
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_BODY:
            return JSONResponse({"error": "Request is too large."}, status_code=413)
    headers = {"Content-Type": "application/json", "Origin": UPSTREAM}
    token = request.cookies.get(SESSION_COOKIE, "")
    if re.fullmatch(r"[a-f0-9]{64}", token):
        headers["Cookie"] = f"{SESSION_COOKIE}={token}"
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=False, trust_env=False) as client:
            upstream = await client.request(
                request.method, f"{UPSTREAM}/api/{path}",
                params=request.query_params, content=bytes(body), headers=headers,
            )
    except httpx.HTTPError:
        return JSONResponse({"error": "The saved-case service is temporarily unavailable. Your saved work is preserved; retry shortly."}, status_code=502)
    response = Response(
        content=upstream.content, status_code=upstream.status_code,
        headers={"Content-Type": upstream.headers.get("content-type", "application/json"), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )
    for cookie in upstream.headers.get_list("set-cookie"):
        if cookie.startswith(f"{SESSION_COOKIE}="):
            response.headers.append("Set-Cookie", cookie)
    return response
