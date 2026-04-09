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

import re
import sys
import shutil
from datetime import datetime

JS_PATH = "/opt/bginvoices/frontend/assets/index-XAyLRfCK.js"


def apply_patch():
    # Backup
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = f"{JS_PATH}.bak.{ts}"
    shutil.copy2(JS_PATH, backup_path)
    print(f"Backup created: {backup_path}")

    with open(JS_PATH, "r") as f:
        code = f.read()

    original_size = len(code)
    changes = 0

    # 1. Fix header: give Дата, Статус, Опции fixed widths for proper alignment
    old_header = (
        'n.jsxs("span",{className:"ml-auto flex items-center gap-3",children:['
        'n.jsx("span",{className:"text-xs text-gray-400",children:"\u0414\u0430\u0442\u0430"}),'
        'n.jsx("span",{className:"text-xs text-gray-400",children:"\u0421\u0442\u0430\u0442\u0443\u0441"}),'
        'n.jsx("span",{className:"text-xs text-gray-400",style:{width:"50px",textAlign:"right"},children:"\u041e\u043f\u0446\u0438\u0438"})]})'
    )

    new_header = (
        'n.jsxs("span",{className:"ml-auto flex items-center gap-2",children:['
        'n.jsx("span",{className:"text-xs text-gray-400",style:{width:"75px",textAlign:"center",flexShrink:0},children:"\u0414\u0430\u0442\u0430"}),'
        'n.jsx("span",{className:"text-xs text-gray-400",style:{width:"28px",textAlign:"center",flexShrink:0},children:"\u0421\u0442\u0430\u0442\u0443\u0441"}),'
        'n.jsx("span",{className:"text-xs text-gray-400",style:{width:"90px",textAlign:"center",flexShrink:0},children:"\u041e\u043f\u0446\u0438\u0438"})]})'
    )

    count = code.count(old_header)
    if count == 0:
        print("WARNING: Header pattern not found - may already be patched")
    else:
        code = code.replace(old_header, new_header)
        changes += count
        print(f"  Replaced {count} header patterns")

    # 2. Adjust date column width and alignment in data rows
    old_date_style = 'style:{width:"85px",textAlign:"right",flexShrink:0}'
    new_date_style = 'style:{width:"75px",textAlign:"center",flexShrink:0}'

    count = code.count(old_date_style)
    if count == 0:
        print("WARNING: Date style pattern not found - may already be patched")
    else:
        code = code.replace(old_date_style, new_date_style)
        changes += count
        print(f"  Replaced {count} date style patterns")

    # 3. Make download icons always visible (remove hover-only opacity)
    old_dl = 'className:"opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600"'
    new_dl = 'className:"text-gray-400 hover:text-indigo-600"'

    count = code.count(old_dl)
    if count == 0:
        print("WARNING: Download opacity pattern not found - may already be patched")
    else:
        code = code.replace(old_dl, new_dl)
        changes += count
        print(f"  Replaced {count} download opacity patterns")

    # 4. Make delete icons always visible (remove hover-only opacity)
    old_del = 'className:"opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"'
    new_del = 'className:"text-gray-400 hover:text-red-600"'

    count = code.count(old_del)
    if count == 0:
        print("WARNING: Delete opacity pattern not found - may already be patched")
    else:
        code = code.replace(old_del, new_del)
        changes += count
        print(f"  Replaced {count} delete opacity patterns")

    if changes == 0:
        print("No changes applied - patch may already be applied.")
        return False

    with open(JS_PATH, "w") as f:
        f.write(code)

    print(f"\nPatch applied successfully!")
    print(f"  Original size: {original_size} bytes")
    print(f"  New size: {len(code)} bytes")
    print(f"  Total replacements: {changes}")
    return True


if __name__ == "__main__":
    success = apply_patch()
    sys.exit(0 if success else 1)
