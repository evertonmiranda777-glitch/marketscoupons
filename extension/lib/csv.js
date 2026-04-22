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

// Parse vários formatos de dia -> "YYYY-MM-DD"
//   "Apr 1, 2026"     (Apex/FTMO style)
//   "04/21/26"        (Bulenox MM/DD/YY)
//   "04/21/2026"      (MM/DD/YYYY)
//   "2026-04-21"      (ISO)
function mcParseMonthDay(s) {
  if (!s) return null;
  const str = s.trim();
  const months = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
  // "Apr 1, 2026"
  let m = /^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/.exec(str);
  if (m) {
    const mm = months[m[1]]; if (!mm) return null;
    return `${m[3]}-${String(mm).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  }
  // "MM/DD/YY" ou "MM/DD/YYYY"
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(str);
  if (m) {
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    let yy = parseInt(m[3], 10);
    if (m[3].length === 2) yy = 2000 + yy;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  }
  // "YYYY-MM-DD"
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (m) return str;
  return null;
}

// Parse "Apr 2026" ou "04/2026" -> { firstDay: "2026-04-01", year, month }
function mcParseMonthYear(s) {
  if (!s) return null;
  const str = s.trim();
  const months = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
  let m = /^([A-Za-z]{3})\s+(\d{4})$/.exec(str);
  if (m) {
    const mm = months[m[1]]; if (!mm) return null;
    return { firstDay: `${m[2]}-${String(mm).padStart(2,'0')}-01`, year: +m[2], month: mm };
  }
  m = /^(\d{1,2})\/(\d{4})$/.exec(str);
  if (m) {
    const mm = parseInt(m[1], 10);
    if (mm < 1 || mm > 12) return null;
    return { firstDay: `${m[2]}-${String(mm).padStart(2,'0')}-01`, year: +m[2], month: mm };
  }
  return null;
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
