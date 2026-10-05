# PyFormatWhy

Pick an int, float or str and a Python format spec; see the result, how the spec was read, and why.

- `app.html` tool, `index.html` landing, `engine.js` (Python 3.10 `format()` semantics for int, float, str; exact decimal rounding with BigInt; no dependencies)
- `test-engine.js` + `oracle.py`: `node test-engine.js SEED N` compares with Python's `format()`

Tests: 120,000 random cases (6 seeds): 65,489 identical, 54,511 error in both, 0 differences. Only whether an error occurs is checked; wording is close to Python's (about 83% identical in a sample) but check order differs.
Not covered: Decimal, Fraction, datetime, bool, locale `n`, nested fields, `!r`, Python 3.11+ options such as `z`.
