import os, uuid, threading
from datetime import datetime, timedelta, timezone

import bcrypt, jwt, numpy as np
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from qdrant_client import QdrantClient, models

DB = create_engine(os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost/tally"))
SECRET = os.getenv("JWT_SECRET", "change-me")
# Uploaded PDF files are saved in this folder (next to app.py).
HERE = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(HERE, "uploads")

# Vector database (Qdrant): keeps one "meaning vector" per document.
# It runs inside this app and saves its data in the qdrant_data folder.
# For a separate Qdrant server, use QdrantClient(url="http://localhost:6333") instead.
class Locked:
    """The embedded Qdrant is not made for many threads at once, so one thread uses it at a time."""
    def __init__(self, client):
        self._c, self._lock = client, threading.RLock()
    def __getattr__(self, name):
        attr = getattr(self._c, name)
        if not callable(attr):
            return attr
        def run(*a, **k):
            with self._lock:
                return attr(*a, **k)
        return run

VDB = Locked(QdrantClient(path=os.path.join(HERE, "qdrant_data")))
COLL = "documents"
if not VDB.collection_exists(COLL):
    VDB.create_collection(COLL, vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE))

def only(org, status="approved", groups=None, ungrouped=False):
    """Filter: only vectors of this organization with this status (and, if given, inside these groups)."""
    must = [
        models.FieldCondition(key="org_id", match=models.MatchValue(value=org)),
        models.FieldCondition(key="status", match=models.MatchValue(value=status)),
    ]
    if groups:
        must.append(models.FieldCondition(key="group_id", match=models.MatchAny(any=groups)))
    if ungrouped:   # documents that have no group yet
        must.append(models.IsEmptyCondition(is_empty=models.PayloadField(key="group_id")))
    return models.Filter(must=must)

def approved_vectors(org):
    ids, vecs, offset = [], [], None
    while True:
        pts, offset = VDB.scroll(COLL, scroll_filter=only(org), limit=256, offset=offset, with_payload=False, with_vectors=True)
        ids += [str(p.id) for p in pts]
        vecs += [p.vector for p in pts]
        if offset is None:
            return ids, vecs

# A second collection keeps one "centre point" (centroid) for every group.
# A new document joins the group whose centre is closest to it (cosine similarity).
GROUPS = "group_centres"
ASSIGN_MIN = float(os.getenv("ASSIGN_MIN", "0.55"))   # how similar a document must be to join a group
if not VDB.collection_exists(GROUPS):
    VDB.create_collection(GROUPS, vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE))

def centres(org, level, parent=None):
    must = [models.FieldCondition(key="org_id", match=models.MatchValue(value=org)),
            models.FieldCondition(key="level", match=models.MatchValue(value=level))]
    if parent:
        must.append(models.FieldCondition(key="parent", match=models.MatchValue(value=parent)))
    return models.Filter(must=must)

def closest_group(org, vector):
    """Id of the group that fits this vector best (a sub-group if one fits), or None if nothing fits."""
    top = VDB.query_points(GROUPS, query=vector, query_filter=centres(org, 0), limit=1).points
    if not top or top[0].score < ASSIGN_MIN:
        return None
    gid = str(top[0].id)
    kids = VDB.query_points(GROUPS, query=vector, query_filter=centres(org, 1, gid), limit=1).points
    if kids and kids[0].score >= ASSIGN_MIN:
        gid = str(kids[0].id)
    return gid
ROLES = ("admin", "sub_admin", "member", "viewer")
app = FastAPI(title="Tally API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
oauth = OAuth2PasswordBearer(tokenUrl="login")

# ---------- helpers ----------
_model = None
def embed(t: str):
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _model.encode(t[:5000], normalize_embeddings=True)

def hash_pw(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def make_token(u):
    exp = datetime.now(timezone.utc) + timedelta(hours=8)
    return jwt.encode({"sub": str(u["id"]), "org": str(u["org_id"]), "role": u["role"], "exp": exp}, SECRET, "HS256")

def me(token: str = Depends(oauth)):
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")

def need(*roles):
    def dep(u=Depends(me)):
        if u["role"] not in roles:
            raise HTTPException(403, "Not allowed for your role")
        return u
    return dep

# ---------- organizations and login ----------
class NewOrg(BaseModel):
    org_name: str
    email: str
    password: str

@app.post("/orgs")
def create_org(b: NewOrg):
    """Sign up a new organization together with its first admin."""
    try:
        with DB.begin() as c:
            o = c.execute(text("INSERT INTO organizations(name) VALUES(:n) RETURNING id"), {"n": b.org_name}).scalar()
            c.execute(text("INSERT INTO users(org_id,email,password_hash,role) VALUES(:o,:e,:p,'admin')"),
                      {"o": o, "e": b.email, "p": hash_pw(b.password)})
    except IntegrityError:
        raise HTTPException(409, "Email already registered")
    return {"org_id": str(o)}

@app.post("/login")
def login(f: OAuth2PasswordRequestForm = Depends()):
    with DB.connect() as c:
        u = c.execute(text("SELECT id,org_id,role,password_hash FROM users WHERE email=:e AND is_active"),
                      {"e": f.username}).mappings().first()
    if not u or not bcrypt.checkpw(f.password.encode(), u["password_hash"].encode()):
        raise HTTPException(401, "Wrong email or password")
    return {"access_token": make_token(u), "token_type": "bearer"}

# ---------- users: admins add more admins, sub-admins, members, viewers ----------
class NewUser(BaseModel):
    email: str
    password: str
    role: str

@app.post("/users")
def add_user(b: NewUser, u=Depends(need("admin"))):
    if b.role not in ROLES:
        raise HTTPException(422, f"role must be one of {ROLES}")
    try:
        with DB.begin() as c:
            i = c.execute(text("""INSERT INTO users(org_id,email,password_hash,role,created_by)
                                  VALUES(:o,:e,:p,:r,:me) RETURNING id"""),
                          {"o": u["org"], "e": b.email, "p": hash_pw(b.password), "r": b.role, "me": u["sub"]}).scalar()
    except IntegrityError:
        raise HTTPException(409, "Email already registered")
    return {"id": str(i)}

@app.get("/users")
def list_users(u=Depends(need("admin"))):
    with DB.connect() as c:
        rows = c.execute(text("SELECT id,email,role,created_by,is_active FROM users WHERE org_id=:o ORDER BY created_at"),
                         {"o": u["org"]}).mappings().all()
    return [{**r, "id": str(r["id"]), "created_by": str(r["created_by"]) if r["created_by"] else None} for r in rows]

@app.delete("/users/{uid}")
def deactivate(uid: str, u=Depends(need("admin"))):
    """An admin can deactivate only the people they added themselves."""
    with DB.begin() as c:
        r = c.execute(text("UPDATE users SET is_active=false WHERE id=:i AND org_id=:o AND created_by=:me"),
                      {"i": uid, "o": u["org"], "me": u["sub"]})
    if r.rowcount == 0:
        raise HTTPException(404, "User not found among the people you added")
    return {"ok": True}

# ---------- documents ----------
@app.post("/documents")
async def upload(background: BackgroundTasks, title: str = Form(...), file: UploadFile = File(...),
                 u=Depends(need("admin", "sub_admin", "member"))):
    import fitz  # pymupdf
    data = await file.read()
    body = "".join(p.get_text() for p in fitz.open(stream=data, filetype="pdf"))
    if not body.strip():
        raise HTTPException(422, "No text found. Scanned PDFs need OCR first.")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.pdf")
    open(path, "wb").write(data)
    vector = embed(body).tolist()
    auto = u["role"] in ("admin", "sub_admin")          # admins and sub-admins skip the review queue
    with DB.begin() as c:
        did = c.execute(text("""INSERT INTO documents(org_id,uploaded_by,title,file_path,content,status,reviewed_by,reviewed_at)
            VALUES(:o,:u,:t,:f,:c,:s,:r,CASE WHEN :a THEN now() END) RETURNING id"""),
            {"o": u["org"], "u": u["sub"], "t": title, "f": path, "c": body,
             "s": "approved" if auto else "pending", "r": u["sub"] if auto else None, "a": auto}).scalar()
        VDB.upsert(COLL, points=[models.PointStruct(
            id=str(did), vector=vector,
            payload={"org_id": u["org"], "status": "approved" if auto else "pending"})])
    if auto:
        background.add_task(after_approval, u["org"], str(did), vector)   # put it in a group
    return {"id": str(did), "status": "approved" if auto else "pending"}

@app.get("/documents")
def list_documents(u=Depends(me)):
    """Admin sees every document of the organization. Others see approved ones plus their own uploads."""
    with DB.connect() as c:
        rows = c.execute(text("""SELECT d.id,d.title,d.status,d.created_at,x.email AS uploaded_by,g.name AS group_name
            FROM documents d JOIN users x ON x.id=d.uploaded_by LEFT JOIN groups g ON g.id=d.group_id
            WHERE d.org_id=:o AND (:adm OR d.status='approved' OR d.uploaded_by=:me)
            ORDER BY d.created_at DESC LIMIT 500"""),
            {"o": u["org"], "adm": u["role"] == "admin", "me": u["sub"]}).mappings().all()
    return [{"id": str(r["id"]), "title": r["title"], "status": r["status"], "uploaded_by": r["uploaded_by"],
             "group": r["group_name"], "created_at": r["created_at"].isoformat()} for r in rows]

@app.get("/documents/{doc_id}/file")
def get_file(doc_id: str, u=Depends(me)):
    try:
        uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(404, "Document not found")
    with DB.connect() as c:
        d = c.execute(text("SELECT title,file_path,status,uploaded_by FROM documents WHERE id=:d AND org_id=:o"),
                      {"d": doc_id, "o": u["org"]}).mappings().first()
    if not d or not (u["role"] == "admin" or d["status"] == "approved" or str(d["uploaded_by"]) == u["sub"]):
        raise HTTPException(404, "Document not found")
    if not os.path.exists(d["file_path"]):
        raise HTTPException(404, "The file is missing on the server")
    return FileResponse(d["file_path"], media_type="application/pdf", filename=d["title"] + ".pdf",
                        content_disposition_type="inline")

@app.get("/documents/pending")
def pending(u=Depends(need("admin"))):
    with DB.connect() as c:
        rows = c.execute(text("""SELECT d.id,d.title,x.email AS uploaded_by FROM documents d
            JOIN users x ON x.id=d.uploaded_by WHERE d.org_id=:o AND d.status='pending' ORDER BY d.created_at"""),
            {"o": u["org"]}).mappings().all()
    return [{**r, "id": str(r["id"])} for r in rows]

class Review(BaseModel):
    approve: bool

@app.post("/documents/{doc_id}/review")
def review(doc_id: str, b: Review, background: BackgroundTasks, u=Depends(need("admin"))):
    with DB.begin() as c:
        r = c.execute(text("""UPDATE documents SET status=:s, reviewed_by=:me, reviewed_at=now()
                              WHERE id=:d AND org_id=:o AND status='pending'"""),
                      {"s": "approved" if b.approve else "rejected", "me": u["sub"], "d": doc_id, "o": u["org"]})
        if r.rowcount == 0:
            raise HTTPException(404, "Pending document not found")
        VDB.set_payload(COLL, payload={"status": "approved" if b.approve else "rejected"}, points=[doc_id])
    if b.approve:
        background.add_task(after_approval, u["org"], doc_id)   # put it in a group
    return {"ok": True}

def related_groups(org, parent_ids):
    """Sub-groups of the given groups, plus the "Other" group (so those documents can still be found)."""
    with DB.connect() as c:
        rows = c.execute(text("""SELECT id::text FROM groups WHERE org_id=:o
            AND (parent_id = ANY(CAST(:p AS uuid[])) OR (parent_id IS NULL AND name='Other'))"""),
            {"o": org, "p": parent_ids}).all()
    return [r[0] for r in rows]

@app.get("/search")
def search(q: str, u=Depends(me)):
    """1) find the groups whose centre is closest to the question  2) cosine search inside those groups
       (and among documents that have no group yet)  3) if there are fewer than 10 results, search all documents."""
    vector = embed(q).tolist()
    org = u["org"]
    hits = []
    near = [str(p.id) for p in VDB.query_points(GROUPS, query=vector, query_filter=centres(org, 0), limit=2).points]
    if near:
        wanted = near + related_groups(org, near)
        hits = VDB.query_points(COLL, query=vector, query_filter=only(org, groups=wanted), limit=10).points
        loose = VDB.query_points(COLL, query=vector, query_filter=only(org, ungrouped=True), limit=10).points
        hits = sorted(hits + loose, key=lambda h: -h.score)[:10]
    if len(hits) < 10:
        seen = {str(h.id) for h in hits}
        more = VDB.query_points(COLL, query=vector, query_filter=only(org), limit=10).points
        hits = hits + [h for h in more if str(h.id) not in seen][: 10 - len(hits)]
    if not hits:
        return []
    with DB.connect() as c:
        rows = c.execute(text("""SELECT d.id::text AS id, d.title, g.name AS group_name FROM documents d
            LEFT JOIN groups g ON g.id=d.group_id WHERE d.id = ANY(CAST(:ids AS uuid[]))"""),
            {"ids": [str(h.id) for h in hits]}).mappings().all()
    info = {r["id"]: r for r in rows}
    return [{"id": str(h.id), "title": info[str(h.id)]["title"], "group": info[str(h.id)]["group_name"],
             "score": round(max(0.0, float(h.score)), 3)} for h in hits if str(h.id) in info]

# ---------- automatic groups (tree) ----------
@app.get("/groups")
def groups(u=Depends(me)):
    with DB.connect() as c:
        rows = c.execute(text("""SELECT g.id,g.parent_id,g.name,count(d.id) AS docs FROM groups g
            LEFT JOIN documents d ON d.group_id=g.id AND d.status='approved'
            WHERE g.org_id=:o GROUP BY g.id"""), {"o": u["org"]}).mappings().all()
    return [{"id": str(r["id"]), "parent_id": str(r["parent_id"]) if r["parent_id"] else None,
             "name": r["name"], "docs": r["docs"]} for r in rows]

def label(texts):
    from sklearn.feature_extraction.text import TfidfVectorizer
    v = TfidfVectorizer(stop_words="english", max_features=2000)
    score = np.asarray(v.fit_transform(texts).sum(axis=0)).ravel()
    words = np.array(v.get_feature_names_out())
    return " ".join(words[score.argsort()[::-1][:2]]).title()

REBUILD_LOCK = threading.RLock()
LAST_TOTAL = {}   # organization -> number of approved documents when its groups were last made

def unit(M):
    m = M.mean(axis=0)
    return (m / np.linalg.norm(m)).tolist()

def rebuild_groups(org):
    """HDBSCAN picks the number of groups itself; big groups are split once more into sub-groups.
    Every group gets a centre point. Returns the number of groups, or None if there are too few documents."""
    import hdbscan
    with REBUILD_LOCK:
        ids, vectors = approved_vectors(org)
        if len(ids) < 10:
            return None
        X = np.array(vectors, dtype=float)
        with DB.begin() as c:
            rows = c.execute(text("SELECT id::text AS id, content FROM documents WHERE id = ANY(CAST(:ids AS uuid[]))"),
                             {"ids": ids}).mappings().all()
            content = {r["id"]: r["content"] for r in rows}
            txt = [content[i] for i in ids]
            top = hdbscan.HDBSCAN(min_cluster_size=max(4, len(ids) // 50)).fit_predict(X)
            c.execute(text("DELETE FROM groups WHERE org_id=:o"), {"o": org})
            VDB.delete(GROUPS, points_selector=models.FilterSelector(filter=models.Filter(
                must=[models.FieldCondition(key="org_id", match=models.MatchValue(value=org))])))

            def make(name, parent, members, level, centre):
                g = str(c.execute(text("INSERT INTO groups(org_id,parent_id,name) VALUES(:o,:p,:n) RETURNING id"),
                                  {"o": org, "p": parent, "n": name}).scalar())
                member_ids = [ids[i] for i in members]
                c.execute(text("UPDATE documents SET group_id=:g WHERE id = ANY(CAST(:ids AS uuid[]))"),
                          {"g": g, "ids": member_ids})
                VDB.set_payload(COLL, payload={"group_id": g}, points=member_ids)
                if centre is not None:
                    VDB.upsert(GROUPS, points=[models.PointStruct(
                        id=g, vector=centre, payload={"org_id": org, "level": level, "parent": parent or ""})])
                return g

            for k in sorted(set(top)):
                idx = np.where(top == k)[0]
                noise = (k == -1)          # documents that fit no group go to "Other" (it has no centre)
                g = make("Other" if noise else label([txt[i] for i in idx]), None, idx, 0, None if noise else unit(X[idx]))
                if not noise and len(idx) >= 30:
                    sub = hdbscan.HDBSCAN(min_cluster_size=5).fit_predict(X[idx])
                    for sid in set(sub) - {-1}:
                        j = idx[sub == sid]
                        make(label([txt[i] for i in j]), g, j, 1, unit(X[j]))
        LAST_TOTAL[org] = len(ids)
        return int(len(set(top) - {-1}))

def maybe_rebuild(org):
    """Makes the groups the first time (10 or more approved documents), and again when many documents
    still have no real group ("Other" or none) AND enough new documents have arrived since the last time."""
    with REBUILD_LOCK:
        with DB.connect() as c:
            total, loose = c.execute(text("""SELECT count(*), count(*) FILTER (WHERE d.group_id IS NULL OR g.name='Other')
                FROM documents d LEFT JOIN groups g ON g.id=d.group_id
                WHERE d.org_id=:o AND d.status='approved'"""), {"o": org}).one()
        last = LAST_TOTAL.get(org, 0)
        if total >= 10 and loose >= max(5, total // 5) and total >= last + max(5, last // 5):
            rebuild_groups(org)

def after_approval(org, doc_id, vector=None):
    """Runs in the background after a document becomes approved: put it in a group, then check if new groups are needed."""
    if vector is None:
        vector = VDB.retrieve(COLL, ids=[doc_id], with_vectors=True)[0].vector
    gid = closest_group(org, vector)
    if gid:
        with DB.begin() as c:
            c.execute(text("UPDATE documents SET group_id=:g WHERE id=:d AND org_id=:o"), {"g": gid, "d": doc_id, "o": org})
        VDB.set_payload(COLL, payload={"group_id": gid}, points=[doc_id])
    maybe_rebuild(org)

@app.post("/groups/rebuild")
def rebuild(u=Depends(need("admin"))):
    n = rebuild_groups(u["org"])
    if n is None:
        raise HTTPException(400, "Need at least 10 approved documents")
    return {"groups": n}
