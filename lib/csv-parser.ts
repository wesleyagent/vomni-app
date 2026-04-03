/**
 * CSV/XLSX parser with fuzzy column mapping for migration imports.
 * Handles UTF-8, UTF-16, Windows-1252 (Hebrew), and common column name variations.
 * Supports English and Hebrew headers seamlessly.
 */

export interface ParsedClient {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  last_visit_at: string | null;   // ISO timestamp or null
  total_visits: number | null;
  last_service: string | null;
  rawRow: Record<string, string>;
}

export interface ParseResult {
  clients: ParsedClient[];
  detectedColumns: {
    name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    firstNameCol: string | null;
    lastNameCol: string | null;
    lastVisitCol: string | null;
    visitCountCol: string | null;
    lastServiceCol: string | null;
  };
  totalRows: number;
  errors: string[];
}

// ── Column name patterns ────────────────────────────────────────────────────

const NAME_PATTERNS = [
  "name", "full name", "fullname", "client name", "clientname",
  "customer", "customer name", "contact name", "שם", "שם מלא", "שם לקוח",
];
const FIRST_NAME_PATTERNS = ["first name", "firstname", "first", "given name", "שם פרטי"];
const LAST_NAME_PATTERNS  = ["last name", "lastname", "surname", "family name", "שם משפחה"];
const EMAIL_PATTERNS = [
  "email", "e-mail", "email address", "emailaddress", "mail",
  "דוא\"ל", "דואל", "אימייל",
];
const PHONE_PATTERNS = [
  "phone", "mobile", "cell", "telephone", "phone number", "mobile number",
  "cell phone", "contact number", "tel", "טלפון", "נייד", "פלאפון",
];
const NOTES_PATTERNS = [
  "notes", "note", "comments", "comment", "memo", "description",
  "client notes", "הערות", "הערה",
];
const LAST_VISIT_PATTERNS = [
  "last visit", "last appointment", "last visit date", "last seen",
  "last booking", "most recent visit", "date of last visit",
  "ביקור אחרון", "תאריך ביקור אחרון", "פגישה אחרונה", "ביקור",
];
const VISIT_COUNT_PATTERNS = [
  "visits", "total visits", "number of visits", "visit count",
  "appointments", "total appointments", "booking count", "num visits",
  "מספר ביקורים", "כמות ביקורים", "ביקורים", "מספר פגישות",
];
const LAST_SERVICE_PATTERNS = [
  "last service", "service", "last treatment", "treatment",
  "last booking service", "service name", "last service type",
  "שירות אחרון", "טיפול אחרון", "שירות",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function fuzzyMatch(header: string, patterns: string[]): boolean {
  const h = header.toLowerCase().trim().replace(/[_\-]/g, " ");
  return patterns.some(p => h === p || h.includes(p) || p.includes(h));
}

function detectColumns(headers: string[]): ParseResult["detectedColumns"] {
  const result: ParseResult["detectedColumns"] = {
    name: null, email: null, phone: null, notes: null,
    firstNameCol: null, lastNameCol: null,
    lastVisitCol: null, visitCountCol: null, lastServiceCol: null,
  };
  for (const h of headers) {
    if (!result.name         && fuzzyMatch(h, NAME_PATTERNS))         result.name         = h;
    if (!result.firstNameCol && fuzzyMatch(h, FIRST_NAME_PATTERNS))   result.firstNameCol = h;
    if (!result.lastNameCol  && fuzzyMatch(h, LAST_NAME_PATTERNS))    result.lastNameCol  = h;
    if (!result.email        && fuzzyMatch(h, EMAIL_PATTERNS))        result.email        = h;
    if (!result.phone        && fuzzyMatch(h, PHONE_PATTERNS))        result.phone        = h;
    if (!result.notes        && fuzzyMatch(h, NOTES_PATTERNS))        result.notes        = h;
    if (!result.lastVisitCol && fuzzyMatch(h, LAST_VISIT_PATTERNS))   result.lastVisitCol = h;
    if (!result.visitCountCol && fuzzyMatch(h, VISIT_COUNT_PATTERNS)) result.visitCountCol = h;
    if (!result.lastServiceCol && fuzzyMatch(h, LAST_SERVICE_PATTERNS)) result.lastServiceCol = h;
  }
  return result;
}

/**
 * Parse a date string from any common format into an ISO timestamp.
 * Handles: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD.MM.YYYY
 * Returns null if unparseable.
 */
function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // YYYY-MM-DD (ISO — most common in exports)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00.000Z");
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // DD/MM/YYYY or DD.MM.YYYY (Israeli/European format)
  const dmyMatch = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    const d = new Date(`${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // MM/DD/YYYY (US format — only if month <= 12 and day > 12 makes DD/MM ambiguous)
  const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, mm, dd, yyyy] = mdyMatch;
    const d = new Date(`${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Try native Date parse as last resort
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseVisitCount(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const n = parseInt(raw.trim(), 10);
  return isNaN(n) || n < 0 ? null : n;
}

/**
 * Normalise phone to E.164 — handles Israeli (05X, +972) and UK (07X, +44) formats.
 */
export function normalisePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let p = raw.replace(/[\s\-().]/g, "").trim();
  if (!p) return null;

  if (p.startsWith("972")) p = "+" + p;
  if (p.startsWith("00972")) p = "+972" + p.slice(5);
  if (/^05\d{8}$/.test(p)) p = "+972" + p.slice(1);

  if (p.startsWith("4407")) p = "+44" + p.slice(2);
  if (p.startsWith("0044")) p = "+44" + p.slice(4);
  if (/^07\d{9}$/.test(p)) p = "+44" + p.slice(1);

  if (p.startsWith("+")) return p;
  return p.length >= 7 ? p : null;
}

function cleanEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const e = raw.trim().toLowerCase();
  return e.includes("@") ? e : null;
}

/**
 * Parse CSV text (already decoded to string) into ParsedClient[].
 * Handles Hebrew and English column headers automatically.
 */
export function parseCSVText(csvText: string): ParseResult {
  const errors: string[] = [];

  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) {
    return {
      clients: [],
      detectedColumns: { name: null, email: null, phone: null, notes: null, firstNameCol: null, lastNameCol: null, lastVisitCol: null, visitCountCol: null, lastServiceCol: null },
      totalRows: 0,
      errors: ["File appears to be empty"],
    };
  }

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim()); current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const headers = parseLine(lines[0]);
  const cols = detectColumns(headers);

  const clients: ParsedClient[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = fields[idx] ?? ""; });

    // Determine name
    let name = "";
    if (cols.name) {
      name = row[cols.name]?.trim() ?? "";
    } else if (cols.firstNameCol && cols.lastNameCol) {
      const fn = row[cols.firstNameCol]?.trim() ?? "";
      const ln = row[cols.lastNameCol]?.trim() ?? "";
      name = [fn, ln].filter(Boolean).join(" ");
    } else if (cols.firstNameCol) {
      name = row[cols.firstNameCol]?.trim() ?? "";
    }

    if (!name) {
      errors.push(`Row ${i + 1}: no name found`);
      continue;
    }

    clients.push({
      name,
      email:        cleanEmail(cols.email       ? row[cols.email]        : null),
      phone:        normalisePhone(cols.phone   ? row[cols.phone]        : null),
      notes:        cols.notes                  ? (row[cols.notes]?.trim() || null) : null,
      last_visit_at: parseDate(cols.lastVisitCol  ? row[cols.lastVisitCol]  : null),
      total_visits:  parseVisitCount(cols.visitCountCol ? row[cols.visitCountCol] : null),
      last_service:  cols.lastServiceCol        ? (row[cols.lastServiceCol]?.trim() || null) : null,
      rawRow: row,
    });
  }

  return { clients, detectedColumns: cols, totalRows: lines.length - 1, errors };
}
