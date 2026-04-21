// Parser CSV simples com suporte a campos entre aspas
function mcParseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim()));
}

// Parse "Apr 1, 2026" -> "2026-04-01"
function mcParseMonthDay(s) {
  if (!s) return null;
  const m = /^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const months = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
  const mm = months[m[1]]; if (!mm) return null;
  return `${m[3]}-${String(mm).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
}

// Parse "Apr 2026" -> { firstDay: "2026-04-01", year: 2026, month: 4 }
function mcParseMonthYear(s) {
  if (!s) return null;
  const m = /^([A-Za-z]{3})\s+(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const months = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
  const mm = months[m[1]]; if (!mm) return null;
  return { firstDay: `${m[2]}-${String(mm).padStart(2,'0')}-01`, year: +m[2], month: mm };
}

function mcNum(s) {
  if (s === '' || s == null) return 0;
  const n = parseFloat(String(s).replace(/[$,\s€£]/g, ''));
  return isNaN(n) ? 0 : n;
}

if (typeof window !== 'undefined') {
  window.mcParseCSV = mcParseCSV;
  window.mcParseMonthDay = mcParseMonthDay;
  window.mcParseMonthYear = mcParseMonthYear;
  window.mcNum = mcNum;
}
