import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
import os
from typing import Optional

from app.config import settings

# Create logs directory if it doesn't exist
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Log format
log_format = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

def get_logger(name: str, log_level: Optional[str] = None) -> logging.Logger:
    """Create and configure a logger with both file and console handlers."""
    logger = logging.getLogger(name)
    
    # Set log level
    level = getattr(logging, log_level or settings.LOG_LEVEL, logging.INFO)
    logger.setLevel(level)
    
    # Prevent adding handlers multiple times in case of module reloading
    if logger.handlers:
        return logger
    
    # File handler with rotation (10 MB per file, keep 5 files)
    file_handler = RotatingFileHandler(
        log_dir / "cyberintelx.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setFormatter(log_format)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_format)
    
    # Add handlers
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# Create a default logger for the application
logger = get_logger(__name__)

# Log unhandled exceptions
def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    
    logger.critical("Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback))

sys.excepthook = handle_exception
