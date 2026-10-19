"""
Megan FastAPI Server.
Bridges the React frontend to the Python AI backend.
Now powered by Cloud Gateway LLM and Multimodal Screen Copilot.
"""

from fastapi import FastAPI

from core import config, logger
from api.middleware.cors import add_cors
from api.middleware.error_handler import global_exception_handler

# Import route modules
from api.routes import chat as chat_routes
from api.routes import steering as steering_routes
from api.routes import voice as voice_routes
from api.routes import automation as automation_routes
from api.routes import settings as settings_routes
from api.routes import organizer as organizer_routes
from api.routes import auth as auth_routes
from api.routes import memory as memory_routes
from api.routes import focus as focus_routes
from api.routes import standup as standup_routes
from api.routes import macro as macro_routes
from api.routes import copilot as copilot_routes

# Import WebSocket modules
from api.websocket import chat_ws
from api.websocket import voice_ws


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title="Megan API",
        description="Next-Generation Privacy-First AI Agent with Multimodal Screen Copilot.",
        version="0.2.0",
    )

    # Middleware
    add_cors(app)
    app.add_exception_handler(Exception, global_exception_handler)

    # REST routes
    app.include_router(auth_routes.router)
    app.include_router(chat_routes.router)
    app.include_router(copilot_routes.router)
    app.include_router(steering_routes.router)
    app.include_router(voice_routes.router)
    app.include_router(automation_routes.router)
    app.include_router(settings_routes.router)
    app.include_router(organizer_routes.router)
    app.include_router(memory_routes.router)
    app.include_router(focus_routes.router)
    app.include_router(standup_routes.router)
    app.include_router(macro_routes.router)

    # WebSocket routes
    app.include_router(chat_ws.router)
    app.include_router(voice_ws.router)

    # Mount static web frontend dashboard if exists
    from pathlib import Path
    from fastapi.staticfiles import StaticFiles
    static_dir = Path(__file__).resolve().parent / "static"
    if static_dir.exists():
        app.mount("/dashboard", StaticFiles(directory=str(static_dir), html=True), name="static")

    @app.on_event("startup")
    async def startup():
        """Wire up all modules and Gateway client on server start."""
        logger.info("Starting Megan API server with Gateway & Screen Copilot...")

        # Initialize local auth database
        try:
            from auth import init_db
            init_db()
            logger.info("Auth database initialized.")
        except Exception as e:
            logger.error(f"Auth database initialization failed: {e}")

        # Initialize Digital Memory service
        try:
            from memory import DigitalMemoryService
            mem_service = DigitalMemoryService()
            memory_routes.init(mem_service)
            logger.info("Digital Memory service initialized.")
        except Exception as e:
            logger.error(f"Digital Memory initialization failed: {e}")

        try:
            from llm import engine, loader
            from automation import ActionHandler
            from organizer import FolderWatcher, AuditLog

            # Init automation
            ah = ActionHandler(require_confirmation=config.confirmation_required)

            # Init organizer
            org_audit = AuditLog()
            org_watcher = FolderWatcher()

            # Wire dependencies into routes
            chat_routes.init(engine)
            voice_routes.init()
            automation_routes.init(ah)
            organizer_routes.init(org_watcher, org_audit)

            # Wire WebSocket handlers
            chat_ws.init(engine, None, None)
            voice_ws.init()

            logger.info("Megan API ready! Gateway client connected.")

        except Exception as e:
            logger.error(f"Startup failed: {e}")

    @app.get("/")
    async def root():
        return {
            "name": "Megan",
            "version": "0.2.0",
            "status": "online",
            "copilot": "active",
            "docs": "/docs",
        }

    @app.get("/health")
    async def health():
        return {
            "status": "healthy",
            "model_loaded": True,
            "engine": "gateway",
            "copilot": "ready",
        }

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
