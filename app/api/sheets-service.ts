import { google, type sheets_v4 } from "googleapis";
import { env } from "./lib/env";

let sheetsClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: env.googleServiceAccountEmail,
      private_key: env.googleServiceAccountPrivateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

interface CacheEntry {
  data: string[][];
  expiry: number;
}

const sheetsCache = new Map<string, CacheEntry>();

export async function getSheetData(spreadsheetId: string, range: string): Promise<string[][]> {
  const cacheKey = `${spreadsheetId}:${range}`;
  const now = Date.now();
  const cached = sheetsCache.get(cacheKey);

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  
  const data = (res.data.values || []) as string[][];
  
  // Cache the data
  sheetsCache.set(cacheKey, {
    data,
    expiry: now + (env.sheetsCacheTtl * 1000),
  });

  return data;
}

export async function appendToSheet(
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
) {
  const sheets = getSheetsClient();
  
  // Clear cache for this spreadsheet as it has been modified
  // We clear all entries for this spreadsheetId to be safe
  for (const key of sheetsCache.keys()) {
    if (key.startsWith(`${spreadsheetId}:`)) {
      sheetsCache.delete(key);
    }
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });
}

export async function getSheetTabs(spreadsheetId: string): Promise<string[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return (res.data.sheets || []).map((s) => s.properties?.title || "").filter(Boolean);
}

export async function checkDuplicateInSheet(
  spreadsheetId: string,
  tabName: string,
  columnIndex: number,
  value: string
): Promise<boolean> {
  const rows = await getSheetData(spreadsheetId, `${tabName}!A:Z`);
  const target = value.trim().toLowerCase();
  for (const row of rows) {
    const cell = (row[columnIndex] || "").toString().trim().toLowerCase();
    if (cell === target) return true;
  }
  return false;
}

export async function ensureSheetHeaders(
  spreadsheetId: string,
  tabName: string,
  headers: string[]
) {
  const rows = await getSheetData(spreadsheetId, `${tabName}!A1:Z1`);
  if (rows.length === 0 || rows[0].length === 0 || rows[0].every((v) => !v)) {
    await appendToSheet(spreadsheetId, `${tabName}!A1`, [headers]);
  }
}
