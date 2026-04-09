#!/usr/bin/env python3
"""
Patch 012: Invoices Column Layout Improvements

Changes to the "Фактури" (Invoices) tab in My Profile:
1. Move "Дата" and "Статус" column headers to the left with fixed widths
   so they align directly above their respective data columns
2. Add "Опции" header label for the download/delete actions column
3. Widen the options column from 50px to 90px to accommodate future icons
4. Make download/delete icons always visible (not just on hover)
5. Adjust date data column width from 85px to 75px for better alignment

Applied to both "Фактури покупки" and "Фактури продажби" sections.
"""

import sys
import shutil
from datetime import datetime

JS_PATH = "/opt/bginvoices/frontend/assets/index-XAyLRfCK.js"

# All replacement pairs: (old_pattern, new_pattern, description)
# Steps 1 and 2 are coordinated (header widths must match data widths).
# Steps 3 and 4 are independent but still applied atomically for safety.
REPLACEMENTS = [
    (
        # 1. Fix header: give Дата, Статус, Опции fixed widths for proper alignment
        'n.jsxs("span",{className:"ml-auto flex items-center gap-3",children:['
        'n.jsx("span",{className:"text-xs text-gray-400",children:"\u0414\u0430\u0442\u0430"}),'
        'n.jsx("span",{className:"text-xs text-gray-400",children:"\u0421\u0442\u0430\u0442\u0443\u0441"}),'
        'n.jsx("span",{className:"text-xs text-gray-400",style:{width:"50px",textAlign:"right"},children:"\u041e\u043f\u0446\u0438\u0438"})]})',
        'n.jsxs("span",{className:"ml-auto flex items-center gap-2",children:['
        'n.jsx("span",{className:"text-xs text-gray-400",style:{width:"75px",textAlign:"center",flexShrink:0},children:"\u0414\u0430\u0442\u0430"}),'
        'n.jsx("span",{className:"text-xs text-gray-400",style:{width:"28px",textAlign:"center",flexShrink:0},children:"\u0421\u0442\u0430\u0442\u0443\u0441"}),'
        'n.jsx("span",{className:"text-xs text-gray-400",style:{width:"90px",textAlign:"center",flexShrink:0},children:"\u041e\u043f\u0446\u0438\u0438"})]})',
        "Column headers (Дата/Статус/Опции) fixed widths",
    ),
    (
        # 2. Adjust date column width and alignment in data rows
        'style:{width:"85px",textAlign:"right",flexShrink:0}',
        'style:{width:"75px",textAlign:"center",flexShrink:0}',
        "Date data column width 85px→75px, right→center",
    ),
    (
        # 3. Make download icons always visible (remove hover-only opacity)
        'className:"opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600"',
        'className:"text-gray-400 hover:text-indigo-600"',
        "Download icon always visible",
    ),
    (
        # 4. Make delete icons always visible (remove hover-only opacity)
        'className:"opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"',
        'className:"text-gray-400 hover:text-red-600"',
        "Delete icon always visible",
    ),
]


def apply_patch():
    # Backup
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = f"{JS_PATH}.bak.{ts}"
    shutil.copy2(JS_PATH, backup_path)
    print(f"Backup created: {backup_path}")

    with open(JS_PATH, "r") as f:
        code = f.read()

    original_size = len(code)

    # --- Pre-flight check: verify ALL patterns exist before touching anything ---
    all_found = True
    for old, _new, desc in REPLACEMENTS:
        count = code.count(old)
        if count == 0:
            print(f"MISSING: {desc} — pattern not found (already patched?)")
            all_found = False
        else:
            print(f"  OK: {desc} — found {count} occurrence(s)")

    if not all_found:
        print("\nABORTED: Not all patterns found. No changes written.")
        print("(If the patch was already applied, this is expected.)")
        return False

    # --- Apply all replacements atomically ---
    total = 0
    for old, new, desc in REPLACEMENTS:
        count = code.count(old)
        code = code.replace(old, new)
        total += count
        print(f"  Replaced {count}x: {desc}")

    with open(JS_PATH, "w") as f:
        f.write(code)

    print(f"\nPatch applied successfully!")
    print(f"  Original size: {original_size} bytes")
    print(f"  New size: {len(code)} bytes")
    print(f"  Total replacements: {total}")
    return True


if __name__ == "__main__":
    success = apply_patch()
    sys.exit(0 if success else 1)
