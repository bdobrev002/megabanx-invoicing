#!/usr/bin/env python3
"""
Deployment script for the invoicing module.
Copies files to VPS and patches the megabanx backend + frontend.

Usage: python deploy.py
Requires: VPS_SSH_PASSWORD env var, sshpass installed
"""

import os
import sys
import subprocess

VPS = "root@144.91.122.208"
PASSWORD = os.environ.get("VPS_SSH_PASSWORD", "")
PATCH_DIR = os.path.dirname(os.path.abspath(__file__))

def ssh(cmd, check=True):
    """Run command on VPS via SSH."""
    full = f'sshpass -p "{PASSWORD}" ssh -o StrictHostKeyChecking=no {VPS} \'{cmd}\''
    result = subprocess.run(full, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"ERROR: {cmd}")
        print(result.stderr)
        return None
    return result.stdout.strip()

def scp(local, remote):
    """Copy file to VPS."""
    full = f'sshpass -p "{PASSWORD}" scp -o StrictHostKeyChecking=no {local} {VPS}:{remote}'
    result = subprocess.run(full, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR copying {local} -> {remote}")
        print(result.stderr)
        return False
    return True

def main():
    if not PASSWORD:
        print("ERROR: VPS_SSH_PASSWORD not set")
        sys.exit(1)

    print("=== Deploying Invoicing Module ===")

    # 1. Copy invoicing router to backend
    print("[1/6] Copying invoicing_router.py to backend...")
    scp(os.path.join(PATCH_DIR, "invoicing_router.py"),
        "/opt/bginvoices/backend/app/invoicing_router.py")

    # 2. Copy PDF template
    print("[2/6] Copying PDF template...")
    ssh("mkdir -p /opt/bginvoices/backend/app/templates")
    scp(os.path.join(PATCH_DIR, "invoice_pdf.html"),
        "/opt/bginvoices/backend/app/templates/invoice_pdf.html")

    # 3. Copy frontend JS module
    print("[3/6] Copying invoicing-module.js to frontend...")
    scp(os.path.join(PATCH_DIR, "invoicing-module.js"),
        "/opt/bginvoices/frontend/assets/invoicing-module.js")

    # 4. Patch index.html to load the invoicing module
    print("[4/6] Patching index.html to load invoicing module...")
    ssh(r"""
    INDEX_FILE="/opt/bginvoices/frontend/index.html"
    if ! grep -q 'invoicing-module.js' "$INDEX_FILE"; then
        sed -i 's|</body>|<script src="/assets/invoicing-module.js"></script>\n</body>|' "$INDEX_FILE"
        echo "index.html patched"
    else
        echo "index.html already patched"
    fi
    """)

    # 5. Patch main.py to include invoicing router
    print("[5/6] Patching main.py to include invoicing router...")
    ssh(r"""
    MAIN_FILE="/opt/bginvoices/backend/app/main.py"
    
    # Check if already patched
    if grep -q 'invoicing_router' "$MAIN_FILE"; then
        echo "main.py already patched"
    else
        # Add import after the last import line
        # Find the line with "app = FastAPI" and add import before it
        
        # First, add the import
        sed -i '/^app = FastAPI/i\
# Invoicing module\
try:\
    from app.invoicing_router import invoicing_router, set_db_config, ensure_invoicing_tables\
    _HAS_INVOICING = True\
except ImportError:\
    _HAS_INVOICING = False\
    logger.warning("Invoicing module not available")\
' "$MAIN_FILE"
        
        # Then, add router inclusion after app creation
        # Find "app = FastAPI" and add after it
        sed -i '/^app = FastAPI/a\
\
# Include invoicing router\
if _HAS_INVOICING:\
    set_db_config(DB_CONFIG)\
    ensure_invoicing_tables()\
    app.include_router(invoicing_router)\
    logger.info("Invoicing module loaded")\
' "$MAIN_FILE"
        
        echo "main.py patched"
    fi
    """)

    # 6. Install dependencies and restart
    print("[6/6] Installing dependencies and restarting backend...")
    ssh("pip3 install httpx jinja2 weasyprint 2>/dev/null || pip install httpx jinja2 weasyprint 2>/dev/null || echo 'deps may already be installed'")
    ssh("systemctl restart bginvoices-backend || supervisorctl restart bginvoices || echo 'Trying manual restart...' && cd /opt/bginvoices/backend && pkill -f 'uvicorn app.main' && sleep 1 && nohup uvicorn app.main:app --host 0.0.0.0 --port 8004 --workers 1 > /var/log/bginvoices.log 2>&1 &")

    print("\n=== Deployment complete ===")
    print("Check logs: ssh root@144.91.122.208 'tail -50 /var/log/bginvoices.log'")
    print("Test API: curl http://144.91.122.208:8004/api/invoicing/clients?company_id=test&profile_id=test")

if __name__ == "__main__":
    main()
