import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function intEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  return value ? parseInt(value, 10) : defaultValue;
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",

  // Google OAuth
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),

  // Google Service Account
  googleServiceAccountEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  googleServiceAccountPrivateKey: required("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n"),

  // Sheet IDs
  googleSheet1Id: required("GOOGLE_SHEET_1_ID"),
  googleSheet2Id: required("GOOGLE_SHEET_2_ID"),

  // Caching
  sheetsCacheTtl: intEnv("SHEETS_CACHE_TTL", 60), // Default 60 seconds

  // Sheet 1 - Fuel Bill columns (0-based)
  fuelBillSlCol: intEnv("FUEL_BILL_SL_COL", 1),
  fuelBillSubCenterCol: intEnv("FUEL_BILL_SUB_CENTER_COL", 2),
  fuelBillCircleCol: intEnv("FUEL_BILL_CIRCLE_COL", 3),
  fuelBillBillingTypeCol: intEnv("FUEL_BILL_BILLING_TYPE_COL", 6),
  fuelBillBillPeriodCol: intEnv("FUEL_BILL_BILL_PERIOD_COL", 8),
  fuelBillBillSubmitAmountCol: intEnv("FUEL_BILL_BILL_SUBMIT_AMOUNT_COL", 9),
  fuelBillTopSheetImageCol: intEnv("FUEL_BILL_TOP_SHEET_IMAGE_COL", 11),
  fuelBillFieldRemarksCol: intEnv("FUEL_BILL_FIELD_REMARKS_COL", 12),
  fuelBillTier1ReceiveCol: intEnv("FUEL_BILL_TIER1_RECEIVE_COL", 13),
  fuelBillTier1SubmitCol: intEnv("FUEL_BILL_TIER1_SUBMIT_COL", 14),
  fuelBillTier2ReceiveCol: intEnv("FUEL_BILL_TIER2_RECEIVE_COL", 15),
  fuelBillTier2SubmitCol: intEnv("FUEL_BILL_TIER2_SUBMIT_COL", 16),
  fuelBillTier3ReceiveCol: intEnv("FUEL_BILL_TIER3_RECEIVE_COL", 17),
  fuelBillTier3SubmitCol: intEnv("FUEL_BILL_TIER3_SUBMIT_COL", 18),
  fuelBillTier4ReceiveCol: intEnv("FUEL_BILL_TIER4_RECEIVE_COL", 19),
  fuelBillTier4SubmitCol: intEnv("FUEL_BILL_TIER4_SUBMIT_COL", 20),

  // Sheet 1 - Petty Cash columns (0-based)
  pettyCashSlCol: intEnv("PETTY_CASH_SL_COL", 1),
  pettyCashSubCenterCol: intEnv("PETTY_CASH_SUB_CENTER_COL", 2),
  pettyCashCircleCol: intEnv("PETTY_CASH_CIRCLE_COL", 3),
  pettyCashPurchaseTypeCol: intEnv("PETTY_CASH_PURCHASE_TYPE_COL", 5),
  pettyCashBillPeriodCol: intEnv("PETTY_CASH_BILL_PERIOD_COL", 8),
  pettyCashBillSubmitAmountCol: intEnv("PETTY_CASH_BILL_SUBMIT_AMOUNT_COL", 9),
  pettyCashTopSheetImageCol: intEnv("PETTY_CASH_TOP_SHEET_IMAGE_COL", 15),
  pettyCashFieldRemarksCol: intEnv("PETTY_CASH_FIELD_REMARKS_COL", 16),
  pettyCashTier1ReceiveCol: intEnv("PETTY_CASH_TIER1_RECEIVE_COL", 17),
  pettyCashTier1SubmitCol: intEnv("PETTY_CASH_TIER1_SUBMIT_COL", 18),
  pettyCashTier2ReceiveCol: intEnv("PETTY_CASH_TIER2_RECEIVE_COL", 19),
  pettyCashTier2SubmitCol: intEnv("PETTY_CASH_TIER2_SUBMIT_COL", 20),
  pettyCashTier3ReceiveCol: intEnv("PETTY_CASH_TIER3_RECEIVE_COL", 21),
  pettyCashTier3SubmitCol: intEnv("PETTY_CASH_TIER3_SUBMIT_COL", 22),

  // Sheet 1 - ID Section
  idSectionEmailCol: intEnv("ID_SECTION_EMAIL_COL", 4),

  // Sheet 2
  sheet2OutputTab: process.env.SHEET_2_OUTPUT_TAB ?? "Sheet1",
};
