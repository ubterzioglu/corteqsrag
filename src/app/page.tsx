import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function Home() {
  const envStatus = [
    "GEMINI_API_KEY",
    "GEMINI_CHAT_MODEL",
    "GEMINI_EMBEDDING_MODEL",
    "GEMINI_EMBEDDING_DIMENSIONS",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ].map((name) => ({
    name,
    present: Boolean(process.env[name]),
  }));

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Gemini + Supabase RAG Starter</p>
          <h1>Corteqs icin minimal server-side RAG akisi hazir.</h1>
          <p className={styles.lead}>
            API route, Gemini yardimcilari, Supabase retrieval katmani ve
            Coolify Docker deploy zemini repo icinde kuruldu.
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Hazir endpoint</h2>
            <p>
              <code>POST /api/chat</code> soruyu alip retrieval ve Gemini cevap
              uretimini tek akista calistirir.
            </p>
            <pre className={styles.codeBlock}>
{`curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"CorteQS ne yapiyor?"}'`}
            </pre>
          </article>

          <article className={styles.card}>
            <h2>Supabase SQL</h2>
            <p>
              <code>supabase/schema.sql</code> dosyasi vector extension, tablo
              ve <code>match_rag_documents</code> fonksiyonunu icerir.
            </p>
          </article>

          <article className={styles.card}>
            <h2>Ortam durumu</h2>
            <ul className={styles.statusList}>
              {envStatus.map((item) => (
                <li key={item.name} className={styles.statusItem}>
                  <code>{item.name}</code>
                  <span
                    className={item.present ? styles.ready : styles.missing}
                  >
                    {item.present ? "hazir" : "eksik"}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
