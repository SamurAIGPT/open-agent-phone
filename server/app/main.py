from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.database import engine, Base
from app.services.ws_manager import ws_manager
from app.routers import numbers, sms, calls, carrier, stats, mcp

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("open_agent_phone")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Create tables if not present
    logger.info("Initializing open-agent-phone database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schema ready.")

    yield

    # 2. Shutdown
    logger.info("Shutting down open-agent-phone database connection...")
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="The Open-Source Phone, SMS & Realtime Voice Gateway for Autonomous AI Agents.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Live Event WebSocket for Dashboard
@app.websocket("/v1/ws/live")
async def live_dashboard_websocket(websocket: WebSocket):
    await ws_manager.connect_broadcast(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_broadcast(websocket)
    except Exception:
        ws_manager.disconnect_broadcast(websocket)

# Routers
app.include_router(stats.router)
app.include_router(numbers.router)
app.include_router(sms.router)
app.include_router(calls.router)
app.include_router(carrier.router)
app.include_router(mcp.router)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "open-agent-phone",
        "version": settings.VERSION
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to Open Agent Phone API",
        "docs": "/docs",
        "mcp": "/mcp/info",
        "health": "/health"
    }
