import sqlite3, base64, os, re

DB = os.path.expandvars(r"%APPDATA%\antigravity\User\globalStorage\state.vscdb")
CONVS = os.path.expandvars(r"%USERPROFILE%\.gemini\antigravity\conversations")

conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("SELECT value FROM ItemTable WHERE key='antigravityUnifiedStateSync.trajectorySummaries'")
val = cur.fetchone()
conn.close()

if not val:
    print("ERROR: Start one conversation in a workspace first."); exit(1)

decoded = base64.b64decode(val[0])
current_uuid = re.findall(rb'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', decoded)[0].decode()

def rv(d,p):
    r,s=0,0
    while p<len(d):
        b=d[p];r|=(b&0x7F)<<s
        if(b&0x80)==0:return r,p+1
        s+=7;p+=1
    return r,p
def wv(v):
    r=b""
    while v>0x7F:r+=bytes([(v&0x7F)|0x80]);v>>=7
    r+=bytes([v&0x7F]);return r or b'\x00'

p=0;_,p=rv(decoded,p);l,p=rv(decoded,p);entry=decoded[p:p+l]

result,count=decoded,0
for f in sorted(os.listdir(CONVS)):
    if not f.endswith('.pb'):continue
    cid=f[:-3]
    if cid==current_uuid:continue
    cloned=entry.replace(current_uuid.encode(),cid.encode())
    result+=wv(0x0a)+wv(len(cloned))+cloned;count+=1

conn=sqlite3.connect(DB)
conn.cursor().execute("UPDATE ItemTable SET value=? WHERE key='antigravityUnifiedStateSync.trajectorySummaries'",(base64.b64encode(result).decode(),))
conn.commit();conn.close()
print(f"Injected {count} conversations. REBOOT YOUR PC (not just app restart).")
