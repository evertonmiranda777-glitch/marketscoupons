// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FIRM_WHITELIST = new Set([
  "apex","bulenox","ftmo","tpt","fn","e2t","the5ers","fundingpips","brightfunded","e8","cti",
  "tradeday","funded-futures-family","goat","toponefutures","blueguardian","aquafutures","blueberryfutures","alphafutures","futureselite"
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // GET debug: ?debug=today retorna conversions criadas hoje UTC pra apex+bulenox
  if (req.method === "GET") {
    const u = new URL(req.url);
    if (u.searchParams.get("debug") === "today") {
      const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
      const today = new Date().toISOString().slice(0,10);
      const { data, error } = await sb
        .from("affiliate_conversions")
        .select("firm_id, transaction_id, amount, status, created_at, raw_payload")
        .in("firm_id", ["apex","bulenox"])
        .gte("created_at", today + "T00:00:00Z")
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ ok: !error, today, count: data?.length || 0, rows: data, error: error?.message });
    }
    if (u.searchParams.get("debug") === "attr_schema") {
      const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data, error } = await sb
        .from("coupon_attributions")
        .select("*")
        .order("sale_date", { ascending: false })
        .limit(2);
      return json({ ok: !error, count: data?.length || 0, sample: data, error: error?.message });
    }
    return json({ error: "method_not_allowed" }, 405);
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const firm = String(body.firm || "").toLowerCase();
  if (!FIRM_WHITELIST.has(firm)) return json({ error: "firm_not_allowed" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Rows padronizados (Apex/Bulenox): [{date, transactions, commission, clicks_all, clicks_unique, granularity?}]
  const rows: any[] = Array.isArray(body.rows) ? body.rows : [];

  // Keyword rows (Apex/Bulenox amember Keywords page): [{keyword, clicks, unique_clicks, leads, sales, commission}]
  const keyword_rows: any[] = Array.isArray(body.keyword_rows) ? body.keyword_rows : [];

  // FTMO snapshot/leads
  const snapshot = body.snapshot || null;
  const leads: any[] = Array.isArray(body.leads) ? body.leads : [];

  const out: any = { ok: true, firm };

  if (rows.length) {
    const normalized = rows
      // Drop monthly summary rows from affiliate panels (Apex/Bulenox CSV includes them).
      // They have granularity='month' and date=firstDayOfMonth, which collides with the day-1 daily row
      // under the (firm_id,date) upsert key, corrupting the day-1 value with the full month total.
      .filter(r => r && r.date && r.granularity !== 'month')
      .map(r => ({
        firm_id: firm,
        date: r.date,
        transactions: Number(r.transactions) || 0,
        commission: Number(r.commission) || 0,
        currency: r.currency || (firm === 'ftmo' ? 'EUR' : 'USD'),
        clicks_all: Number(r.clicks_all) || 0,
        clicks_unique: Number(r.clicks_unique) || 0,
        source: String(body.source || 'ext'),
        raw: { granularity: r.granularity || 'day', affiliate_id: body.affiliate_id || null, ...r }
      }));

    if (normalized.length) {
      const { error, count } = await sb
        .from("affiliate_daily_stats")
        .upsert(normalized, { onConflict: "firm_id,date", count: "exact" });
      if (error) return json({ error: "upsert_failed", details: error.message }, 500);
      out.rows_saved = normalized.length;
    }

    // Backfill sintetico BATCHED em dia BRT (alinha com sale_date BRT).
    // perTx = (commission - sumReal) / gap. Sobrescreve synth existentes (ignoreDuplicates:false).
    // Conta existing por dia BRT: venda 25/05 23:56 BRT = 26/05 02:56 UTC pertence ao dia 25 BRT.
    const brtDayFromISO = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600000).toISOString().slice(0, 10);
    let synth_created = 0;
    const daysWithTx = normalized.filter((r: any) => r.transactions > 0);
    if (daysWithTx.length) {
      const minDate = daysWithTx.reduce((m: string, r: any) => r.date < m ? r.date : m, daysWithTx[0].date);
      const maxDate = daysWithTx.reduce((m: string, r: any) => r.date > m ? r.date : m, daysWithTx[0].date);
      // Janela de busca: -1 dia em UTC do minDate ate +1 dia UTC do maxDate pra capturar vendas
      // que vazaram do TZ no banco
      const searchStart = new Date(Date.parse(`${minDate}T00:00:00Z`) - 86400000).toISOString();
      const searchEnd = new Date(Date.parse(`${maxDate}T23:59:59Z`) + 86400000).toISOString();
      const { data: existing } = await sb
        .from("affiliate_conversions")
        .select("transaction_id, amount, created_at")
        .eq("firm_id", firm)
        .gte("created_at", searchStart)
        .lte("created_at", searchEnd)
        .limit(10000);
      const realByDay: Record<string, { count: number; sumAmount: number }> = {};
      const synthByDay: Record<string, { id?: string; transaction_id: string; created_at: string }[]> = {};
      // Precisa do id pra deletar, refetch com id
      const { data: existingFull } = await sb
        .from("affiliate_conversions")
        .select("id, transaction_id, amount, created_at")
        .eq("firm_id", firm)
        .gte("created_at", searchStart)
        .lte("created_at", searchEnd)
        .limit(10000);
      (existingFull || []).forEach((e: any) => {
        const brtDay = brtDayFromISO(e.created_at);
        if (typeof e.transaction_id === "string" && e.transaction_id.startsWith("synth-")) {
          if (!synthByDay[brtDay]) synthByDay[brtDay] = [];
          synthByDay[brtDay].push({ id: e.id, transaction_id: e.transaction_id, created_at: e.created_at });
          return;
        }
        if (!realByDay[brtDay]) realByDay[brtDay] = { count: 0, sumAmount: 0 };
        realByDay[brtDay].count++;
        realByDay[brtDay].sumAmount += Number(e.amount) || 0;
      });
      // Refund cleanup: pra cada dia com synth, mantém só (transactions - real_count) synth.
      // Excesso = transactions caiu no painel (refund/chargeback). Deleta synth mais recentes.
      const idsToDelete: string[] = [];
      for (const r of daysWithTx) {
        const synth = synthByDay[r.date] || [];
        const real = realByDay[r.date] || { count: 0, sumAmount: 0 };
        const keep = Math.max(0, r.transactions - real.count);
        if (synth.length > keep) {
          const excess = synth.sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0, synth.length - keep);
          excess.forEach(s => s.id && idsToDelete.push(s.id));
        }
      }
      if (idsToDelete.length) {
        // Delete coupon_attributions referenciando, depois affiliate_conversions
        for (let i = 0; i < idsToDelete.length; i += 200) {
          const slice = idsToDelete.slice(i, i + 200);
          await sb.from("coupon_attributions").delete().in("conversion_id", slice);
          await sb.from("affiliate_conversions").delete().in("id", slice);
        }
        out.synth_refund_removed = idsToDelete.length;
      }
      const allSynths: any[] = [];
      // Dia BRT atual, não criar synths pro dia em andamento (espalharia em horários futuros e infla
      // dashboards de campanha com vendas em horas que ainda não chegaram). Markets Monitor cobre vendas
      // reais em tempo real; o gap do dia atual fica pra o cron noturno preencher quando o dia fechar.
      const todayBrt = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      for (const r of daysWithTx) {
        if (r.date === todayBrt) continue;
        const real = realByDay[r.date] || { count: 0, sumAmount: 0 };
        const gap = r.transactions - real.count;
        if (gap <= 0) continue;
        const remainingComm = Math.max(0, r.commission - real.sumAmount);
        // FIX 2026-06-09: nao criar synth com amount=0 (MM ja capturou commission suficiente,
        // synth $0 vira fantasma que infla contagem de vendas no painel sem agregar valor).
        if (remainingComm <= 0) continue;
        const perTx = remainingComm / gap;
        const dateNoDash = r.date.replace(/-/g, '');
        // Coloca synth NOON BRT do dia (= 15:00 UTC), fica claramente no dia BRT
        // distribuído entre 09:00-21:00 BRT pra parecer trader em horário comercial
        const noonBrtMs = Date.parse(`${r.date}T15:00:00Z`);
        const startIdx = real.count + 1;
        for (let i = 0; i < gap; i++) {
          const idx = startIdx + i;
          // Spread 12h em torno de noon BRT
          const offsetMs = ((idx - 0.5) * 43200000 / r.transactions) - 21600000;
          allSynths.push({
            firm_id: firm,
            event_type: "sale",
            transaction_id: `synth-${firm}-${dateNoDash}-${String(idx).padStart(3,'0')}`,
            amount: Number(perTx.toFixed(2)),
            currency: r.currency || (firm === 'ftmo' ? 'EUR' : 'USD'),
            status: 'approved',
            created_at: new Date(noonBrtMs + offsetMs).toISOString(),
            raw_payload: { synthetic: true, source: 'finance_sync_backfill_v2', from_row: { date: r.date, transactions: r.transactions, commission: r.commission, real_count: real.count, real_sum: real.sumAmount } }
          });
        }
      }
      for (let i = 0; i < allSynths.length; i += 500) {
        const chunk = allSynths.slice(i, i + 500);
        const { error: synErr } = await sb
          .from("affiliate_conversions")
          .upsert(chunk, { onConflict: "firm_id,transaction_id", ignoreDuplicates: false });
        if (!synErr) synth_created += chunk.length;
      }
      // Propaga amount novo das synth pra coupon_attributions (trigger so dispara em INSERT)
      if (allSynths.length) {
        const synthTxIds = allSynths.map(s => s.transaction_id);
        for (let i = 0; i < synthTxIds.length; i += 200) {
          const slice = synthTxIds.slice(i, i + 200);
          const { data: rows } = await sb
            .from("affiliate_conversions")
            .select("id, amount, transaction_id")
            .eq("firm_id", firm)
            .in("transaction_id", slice);
          for (const sr of (rows || [])) {
            await sb.from("coupon_attributions").update({ amount: sr.amount }).eq("conversion_id", sr.id);
          }
        }
      }
    }
    if (synth_created) out.synthetic_created = synth_created;
  }

  if (leads.length) {
    const txs = leads
      // aceita 3 formatos de lead: transaction_id ja pronto (scrapers novos tipo FFF 'fff:<txn>'),
      // order_id (scrapers antigos), ou lead. Sem isso as vendas individuais do FFF eram DESCARTADAS
      // e nunca viravam conversao real -> nunca disparavam Purchase/Telegram.
      .filter(l => l && (l.order_id || l.lead || l.transaction_id))
      .map(l => {
        const txId = l.transaction_id ? String(l.transaction_id)
          : (l.order_id ? `${firm}:${l.order_id}` : null);
        // Purchase value = NOSSA comissao, nao o valor bruto pago pelo cliente. Se o lead trouxer
        // commission usa ela; senao cai no amount.
        const amt = (l.commission !== undefined && l.commission !== null && l.commission !== '')
          ? Number(l.commission) : (Number(l.amount) || 0);
        const row: any = {
          firm_id: firm,
          event_type: "sale",
          transaction_id: txId,
          amount: Number(amt) || 0,
          currency: firm === 'ftmo' ? 'EUR' : 'USD',
          status: (l.status || 'approved').toLowerCase(),
          raw_payload: l
        };
        // created_at pela data da venda (pro match de clique cair na janela de 7d certa).
        if (l.date && /^\d{4}-\d{2}-\d{2}$/.test(String(l.date))) row.created_at = `${l.date}T15:00:00Z`;
        return row;
      })
      .filter(t => t.transaction_id);

    if (txs.length) {
      const { error } = await sb
        .from("affiliate_conversions")
        .upsert(txs, { onConflict: "firm_id,transaction_id", ignoreDuplicates: false });
      if (error) return json({ error: "upsert_leads_failed", details: error.message }, 500);
      out.leads_saved = txs.length;
    }
  }

  if (keyword_rows.length) {
    const today = new Date().toISOString().slice(0, 10);
    const kwNorm = keyword_rows
      .filter(k => k && k.keyword)
      .map(k => ({
        firm_id: firm,
        keyword: String(k.keyword).slice(0, 200),
        snapshot_date: k.snapshot_date || today,
        clicks: Number(k.clicks) || 0,
        unique_clicks: Number(k.unique_clicks) || 0,
        leads: Number(k.leads) || 0,
        sales: Number(k.sales) || 0,
        commission: Number(k.commission) || 0,
        currency: k.currency || (firm === 'ftmo' ? 'EUR' : 'USD'),
        source: String(body.source || 'ext_keywords'),
        raw: k
      }));
    if (kwNorm.length) {
      const { error } = await sb
        .from("affiliate_keyword_stats")
        .upsert(kwNorm, { onConflict: "firm_id,keyword,snapshot_date" });
      if (error) return json({ error: "upsert_keywords_failed", details: error.message }, 500);
      out.keywords_saved = kwNorm.length;
    }
  }

  if (snapshot) {
    const today = new Date().toISOString().slice(0, 10);
    const snapRow = {
      firm_id: firm,
      date: today,
      transactions: Number(snapshot.clients_registered) || 0,
      commission: Number(snapshot.ready_for_payout) || 0,
      currency: firm === 'ftmo' ? 'EUR' : 'USD',
      clicks_all: Number(snapshot.clicks) || 0,
      clicks_unique: 0,
      source: String(body.source || 'ext_snapshot'),
      raw: { snapshot }
    };
    const { error } = await sb
      .from("affiliate_daily_stats")
      .upsert([snapRow], { onConflict: "firm_id,date" });
    if (error) return json({ error: "upsert_snap_failed", details: error.message }, 500);
    out.snapshot_saved = true;
  }

  return json(out);
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}
