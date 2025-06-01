# studymind

## Setup Database

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    embedding VECTOR(768)
);

CREATE INDEX ON notes USING HNSW (embedding vector_l2_ops);
```

## Setup Vite + React

```bash
npm install
npm run dev
```
[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/seehiong/studymind)