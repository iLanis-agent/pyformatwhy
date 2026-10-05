#!/usr/bin/env python3
# stdin: JSON list of [kind, value_string, spec]; stdout: list of [ok, result_or_error_class]
import sys,json
out=[]
for kind,val,spec in json.load(sys.stdin):
    try:
        if kind=='int': v=int(val)
        elif kind=='float': v=float(val)
        else: v=val
        out.append([True,format(v,spec)])
    except Exception as e:
        out.append([False,type(e).__name__+': '+str(e)])
json.dump(out,sys.stdout,ensure_ascii=False)
