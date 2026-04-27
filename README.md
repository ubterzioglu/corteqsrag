# Corteqs RAG Starter

Minimal Next.js App Router projesi. Soru alir, Gemini ile embedding uretir, Supabase pgvector uzerinden context ceker, sonra Gemini ile final cevabi dondurur.

## Setup

1. Bagimliliklari kur:

```bash
npm install
```

2. Ortam dosyasini hazirla:

```bash
cp .env.example .env.local
```

3. `.env.local` icini doldur:

```env
GEMINI_API_KEY=
GEMINI_CHAT_MODEL=gemini-2.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSIONS=1536

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

4. `supabase/schema.sql` dosyasindaki SQL'i Supabase SQL Editor'de calistir.

5. Uygulamayi baslat:

```bash
npm run dev
```

## API

Endpoint:

```text
POST /api/chat
```

Ornek istek:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"CorteQS ne yapiyor?"}'
```

Ornek cevap:

```json
{
  "answer": "string",
  "hasContext": true
}
```

## Key Files

- `src/lib/gemini.ts`: Gemini embedding ve cevap uretimi
- `src/lib/supabase-admin.ts`: server-only Supabase client
- `src/lib/rag.ts`: retrieval ve context olusturma
- `src/app/api/chat/route.ts`: minimal RAG API route
- `supabase/schema.sql`: pgvector tablo ve RPC fonksiyonu

## Coolify Deploy

- Bu repo Dockerfile tabanli deploy icin hazirdir.
- Coolify'de build source olarak repo sec ve Dockerfile kullan.
- Gerekli env degiskenlerini Coolify UI icinden ekle.
- Ayrica health check tanimlama.
- Supabase SQL kurulumu otomatik degil; `supabase/schema.sql` manuel uygulanmali.

## Notes

- `GEMINI_API_KEY` ve `SUPABASE_SERVICE_ROLE_KEY` sadece server-side kullanilmalidir.
- Gercek secret degerlerini repoya commit etme.
- Bu iterasyonda ingestion UI, auth ve citation yoktur.
- Mevcut Supabase vector kolonu 1536 ise `GEMINI_EMBEDDING_DIMENSIONS=1536` kullan.
