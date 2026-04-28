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
