import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getSheetData, appendToSheet, checkDuplicateInSheet, ensureSheetHeaders } from "./sheets-service";
import { env } from "./lib/env";

const TIER_NAMES_FUEL = [
  "Telecom Fuel Management",
  "Central Accounts for Invoice",
  "Central Audit",
  "Central Accounts for payment",
];

const TIER_NAMES_PETTY = [
  "Telecom Billing",
  "Central Audit",
  "Central Accounts",
];

function convertSerialDate(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && value > 30000) {
    // Google Sheets / Excel serial date (epoch: Dec 30, 1899)
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
  }
  const str = value.toString().trim();
  if (str === "-" || str === "0") return "";
  return str;
}

async function getIdSectionEmails(): Promise<string[]> {
  const rows = await getSheetData(env.googleIdSheetId, "ID!A:Z");
  const emailCol = env.idSectionEmailCol;
  return rows
    .slice(1) // skip header
    .map((row) => (row[emailCol] || "").toString().trim().toLowerCase())
    .filter(Boolean);
}

async function searchFuelBill(slValue: string) {
  const rows = await getSheetData(env.googleSheet1Id, "Fuel Bill!A:AZ");
  if (rows.length < 2) return null;

  const slCol = env.fuelBillSlCol;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if ((row[slCol] || "").toString().trim() === slValue.trim()) {
      const tiers = [];
      const tierReceiveCols = [
        env.fuelBillTier1ReceiveCol,
        env.fuelBillTier2ReceiveCol,
        env.fuelBillTier3ReceiveCol,
        env.fuelBillTier4ReceiveCol,
      ];
      const tierSubmitCols = [
        env.fuelBillTier1SubmitCol,
        env.fuelBillTier2SubmitCol,
        env.fuelBillTier3SubmitCol,
        env.fuelBillTier4SubmitCol,
      ];
      for (let t = 0; t < 4; t++) {
        const receiveDate = convertSerialDate(row[tierReceiveCols[t]]);
        const submitDate = convertSerialDate(row[tierSubmitCols[t]]);
        tiers.push({
          name: TIER_NAMES_FUEL[t],
          receiveDate: receiveDate || null,
          submitDate: submitDate || null,
          completed: !!receiveDate && !!submitDate,
        });
      }

      return {
        type: "fuel_bill" as const,
        sl: (row[slCol] ?? "").toString(),
        subCenterName: (row[env.fuelBillSubCenterCol] ?? "").toString(),
        circleName: (row[env.fuelBillCircleCol] ?? "").toString(),
        billingType: (row[env.fuelBillBillingTypeCol] ?? "").toString(),
        billPeriod: (row[env.fuelBillBillPeriodCol] ?? "").toString(),
        billSubmitAmount: (row[env.fuelBillBillSubmitAmountCol] ?? "").toString(),
        billSentDate: convertSerialDate(row[env.fuelBillBillSentDateCol]) || null,
        topSheetImage: (row[env.fuelBillTopSheetImageCol] ?? "").toString(),
        fieldRemarks: (row[env.fuelBillFieldRemarksCol] ?? "").toString(),
        tiers,
      };
    }
  }
  return null;
}

async function searchPettyCash(slValue: string) {
  const rows = await getSheetData(env.googleSheet1Id, "Petty Cash!A:AZ");
  if (rows.length < 2) return null;

  const slCol = env.pettyCashSlCol;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if ((row[slCol] || "").toString().trim() === slValue.trim()) {
      const tiers = [];
      const tierReceiveCols = [
        env.pettyCashTier1ReceiveCol,
        env.pettyCashTier2ReceiveCol,
        env.pettyCashTier3ReceiveCol,
      ];
      const tierSubmitCols = [
        env.pettyCashTier1SubmitCol,
        env.pettyCashTier2SubmitCol,
        env.pettyCashTier3SubmitCol,
      ];
      for (let t = 0; t < 3; t++) {
        const receiveDate = convertSerialDate(row[tierReceiveCols[t]]);
        let submitDate = convertSerialDate(row[tierSubmitCols[t]]);
        // Only for Petty Cash Central Accounts (tier 2): fallback to next column
        if (t === 2 && !submitDate && tierSubmitCols[t] + 1 < row.length) {
          submitDate = convertSerialDate(row[tierSubmitCols[t] + 1]);
        }
        tiers.push({
          name: TIER_NAMES_PETTY[t],
          receiveDate: receiveDate || null,
          submitDate: submitDate || null,
          completed: !!receiveDate && !!submitDate,
        });
      }

      return {
        type: "petty_cash" as const,
        sl: (row[slCol] ?? "").toString(),
        subCenterName: (row[env.pettyCashSubCenterCol] ?? "").toString(),
        circleName: (row[env.pettyCashCircleCol] ?? "").toString(),
        purchaseType: (row[env.pettyCashPurchaseTypeCol] ?? "").toString(),
        billPeriod: (row[env.pettyCashBillPeriodCol] ?? "").toString(),
        billSubmitAmount: (row[env.pettyCashBillSubmitAmountCol] ?? "").toString(),
        billSentDate: convertSerialDate(row[env.pettyCashBillSentDateCol]) || null,
        topSheetImage: (row[env.pettyCashTopSheetImageCol] ?? "").toString(),
        fieldRemarks: (row[env.pettyCashFieldRemarksCol] ?? "").toString(),
        tiers,
      };
    }
  }
  return null;
}

export const sheetsRouter = createRouter({
  validateEmail: authedQuery.query(async (opts) => {
    const userEmail = opts.ctx.user?.email;
    if (!userEmail) {
      return { valid: false, message: "User email not found" };
    }
    try {
      const emails = await getIdSectionEmails();
      const valid = emails.includes(userEmail.toLowerCase().trim());
      return {
        valid,
        message: valid ? "Email validated successfully" : "Your email is not registered in the system. Please contact admin.",
      };
    } catch (error) {
      console.error("[sheets] Email validation error:", error);
      return { valid: false, message: "Unable to validate email. Please try again later." };
    }
  }),

  search: authedQuery
    .input(z.object({ sl: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        const fuelResult = await searchFuelBill(input.sl);
        const pettyResult = await searchPettyCash(input.sl);

        if (fuelResult && pettyResult) {
          return { found: true, data: fuelResult, otherMatch: pettyResult };
        }
        if (fuelResult) {
          return { found: true, data: fuelResult, otherMatch: null };
        }
        if (pettyResult) {
          return { found: true, data: pettyResult, otherMatch: null };
        }

        return { found: false, data: null, otherMatch: null, message: "BTS tracking number not found in Fuel Bill or Petty Cash records." };
      } catch (error) {
        console.error("[sheets] Search error:", error);
        return { found: false, data: null, otherMatch: null, message: "Search failed. Please try again later." };
      }
    }),

  getUserInfo: authedQuery.query(async (opts) => {
    const userEmail = opts.ctx.user?.email;
    if (!userEmail) {
      return { circle: null, subCenter: null };
    }
    try {
      const rows = await getSheetData(env.googleIdSheetId, "ID!A:Z");
      for (const row of rows) {
        const email = (row[env.idSectionEmailCol] || "").toString().trim().toLowerCase();
        if (email === userEmail.toLowerCase().trim()) {
          return {
            circle: (row[1] || "").toString().trim(),
            subCenter: (row[2] || "").toString().trim(),
          };
        }
      }
      return { circle: null, subCenter: null };
    } catch (error) {
      console.error("[sheets] getUserInfo error:", error);
      return { circle: null, subCenter: null };
    }
  }),

  submit: authedQuery
    .input(
      z.object({
        sl: z.string().min(1),
        type: z.enum(["fuel_bill", "petty_cash"]),
        circle: z.string().optional(),
        subCenter: z.string().optional(),
        billingType: z.string().optional(),
        billPeriod: z.string().optional(),
        billSentDate: z.string().optional(),
        billSubmitAmount: z.string().optional(),
        fieldRemarks: z.string().optional(),
        topSheetImage: z.string().optional(),
        currentPosition: z.string().optional(),
        dieselAg: z.number().min(0),
        octanePg: z.number().min(0),
        petrolPg: z.number().min(0),
        dieselVehicle: z.number().min(0),
        purchaseSource: z.enum(["Cash purchase from enlisted pump", "Local Purchase"]),
        pumpName: z.string().optional(),
        amountReturnViaBank: z.number().min(0),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userEmail = ctx.user?.email || "unknown";
        const userName = ctx.user?.name || "unknown";

        // Check duplicate in Sheet 2 (SL is in column D, index 3)
        const isDuplicate = await checkDuplicateInSheet(
          env.googleSheet2Id,
          env.sheet2OutputTab,
          3,
          input.sl
        );
        if (isDuplicate) {
          return { success: false, message: `BTS Tracker Number ${input.sl} has already been submitted.` };
        }

        const now = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Dhaka",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date());

        // Ensure headers exist
        await ensureSheetHeaders(env.googleSheet2Id, env.sheet2OutputTab, [
          "Submission Date", "User Email", "User Name", "BTS Tracker Number", "Type",
          "Circle", "Sub Center", "Billing Type", "Bill Period", "Bill Sent Date",
          "Bill Submit Amount", "Field Remarks", "Bill Top Sheet Image", "Current Position Status",
          "Diesel-AG", "Octane-PG", "Petrol-PG", "Diesel-Vehicle",
          "Purchase Source", "Pump Name", "Amount Return via Bank", "Remarks",
        ]);

        const row = [
          now,
          userEmail,
          userName,
          input.sl,
          input.type,
          input.circle || "",
          input.subCenter || "",
          input.billingType || "",
          input.billPeriod || "",
          input.billSentDate || "",
          input.billSubmitAmount || "",
          input.fieldRemarks || "",
          input.topSheetImage || "",
          input.currentPosition || "",
          input.dieselAg,
          input.octanePg,
          input.petrolPg,
          input.dieselVehicle,
          input.purchaseSource,
          input.pumpName || "",
          input.amountReturnViaBank,
          input.remarks || "",
        ];

        await appendToSheet(
          env.googleSheet2Id,
          `${env.sheet2OutputTab}!A:V`,
          [row]
        );

        return {
          success: true,
          message: "Data submitted successfully",
          submitted: { ...input, submissionDate: now, userEmail, userName },
        };
      } catch (error) {
        console.error("[sheets] Submit error:", error);
        return { success: false, message: "Failed to submit data. Please try again later." };
      }
    }),
});
