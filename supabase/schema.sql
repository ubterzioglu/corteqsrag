create extension if not exists vector;

create table if not exists rag_documents (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text not null,
  source text,
  metadata jsonb default '{}',
  embedding vector(3072),
  created_at timestamptz default now()
);

create or replace function match_rag_documents (
  query_embedding vector(3072),
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  content text,
  source text,
  similarity float
)
language sql stable
as $$
  select
    rag_documents.id,
    rag_documents.title,
    rag_documents.content,
    rag_documents.source,
    1 - (rag_documents.embedding <=> query_embedding) as similarity
  from rag_documents
  where rag_documents.embedding is not null
  order by rag_documents.embedding <=> query_embedding
  limit match_count;
$$;
