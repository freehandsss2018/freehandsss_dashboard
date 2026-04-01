# Lesson: Windows UTF-8 Encoding Fix for Python Scripts

## Problem
When running Python scripts that output UTF-8 symbols (e.g., ✅, 🔴, ─, ═) on a Windows terminal configured with Traditional Chinese (CP950), the script may crash with a `UnicodeEncodeError`.

```python
UnicodeEncodeError: 'cp950' codec can't encode character '\u2705' in position 2: illegal multibyte sequence
```

## Root Cause
The default `sys.stdout` and `sys.stderr` in Windows CMD/PowerShell often default to the system locale (e.g., CP950), which does not support the full range of Unicode characters provided by modern CLI tools or the FHS framework.

## Solution
Force `sys.stdout` and `sys.stderr` to use `UTF-8` encoding with a replacements handler. This ensures that even if the terminal doesn't support the character, it won't crash the script.

```python
import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
```

## Context
Applied to `Maintenance_Tools/run_all.py` and `Maintenance_Tools/generate_fix_payload.py` during the `V45.7.4` health check session on 2026-04-02.
