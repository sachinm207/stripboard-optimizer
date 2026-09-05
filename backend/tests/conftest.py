import os
import sys
from pathlib import Path

os.environ.setdefault("STRIPBOARD_FAST_MODE", "1")

# Add backend directory and root directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
root_dir = backend_dir.parent

if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

