import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getSheetData, appendToSheet } from "./sheets-service";
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

async function getIdSectionEmails(): Promise<string[]> {
  const rows = await getSheetData(env.googleIdSheetId, "ID!A:Z");
  const emailCol = env.idSectionEmailCol;
  return rows
    .slice(1) // skip header
    .map((row) => (row[emailCol] || "").toString().trim().toLowerCase())
    .filter(Boolean);
}

async function searchFuelBill(slValue: string) {
  const rows = await getSheetData(env.googleSheet1Id, "Fuel Bill!A:Z");
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
        const receiveRaw = row[tierReceiveCols[t]];
        const submitRaw = row[tierSubmitCols[t]];
        const receiveDate = receiveRaw !== undefined && receiveRaw !== null ? receiveRaw.toString().trim() : "";
        const submitDate = submitRaw !== undefined && submitRaw !== null ? submitRaw.toString().trim() : "";
        tiers.push({
          name: TIER_NAMES_FUEL[t],
          receiveDate: receiveDate || null,
          submitDate: submitDate || null,
          completed: !!receiveDate && !!submitDate,
        });
      }

      return {
        type: "fuel_bill" as const,
        sl: row[slCol] || "",
        subCenterName: row[env.fuelBillSubCenterCol] || "",
        circleName: row[env.fuelBillCircleCol] || "",
        billingType: row[env.fuelBillBillingTypeCol] || "",
        billPeriod: row[env.fuelBillBillPeriodCol] || "",
        billSubmitAmount: row[env.fuelBillBillSubmitAmountCol] || "",
        topSheetImage: row[env.fuelBillTopSheetImageCol] || "",
        fieldRemarks: row[env.fuelBillFieldRemarksCol] || "",
        tiers,
      };
    }
  }
  return null;
}

async function searchPettyCash(slValue: string) {
  const rows = await getSheetData(env.googleSheet1Id, "Petty Cash!A:Z");
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
        const receiveRaw = row[tierReceiveCols[t]];
        const submitRaw = row[tierSubmitCols[t]];
        const receiveDate = receiveRaw !== undefined && receiveRaw !== null ? receiveRaw.toString().trim() : "";
        const submitDate = submitRaw !== undefined && submitRaw !== null ? submitRaw.toString().trim() : "";
        tiers.push({
          name: TIER_NAMES_PETTY[t],
          receiveDate: receiveDate || null,
          submitDate: submitDate || null,
          completed: !!receiveDate && !!submitDate,
        });
      }

      return {
        type: "petty_cash" as const,
        sl: row[slCol] || "",
        subCenterName: row[env.pettyCashSubCenterCol] || "",
        circleName: row[env.pettyCashCircleCol] || "",
        purchaseType: row[env.pettyCashPurchaseTypeCol] || "",
        billPeriod: row[env.pettyCashBillPeriodCol] || "",
        billSubmitAmount: row[env.pettyCashBillSubmitAmountCol] || "",
        topSheetImage: row[env.pettyCashTopSheetImageCol] || "",
        fieldRemarks: row[env.pettyCashFieldRemarksCol] || "",
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
        // Search Fuel Bill first
        const fuelResult = await searchFuelBill(input.sl);
        if (fuelResult) {
          return { found: true, data: fuelResult };
        }

        // Search Petty Cash
        const pettyResult = await searchPettyCash(input.sl);
        if (pettyResult) {
          return { found: true, data: pettyResult };
        }

        return { found: false, data: null, message: "BTS tracking number not found in Fuel Bill or Petty Cash records." };
      } catch (error) {
        console.error("[sheets] Search error:", error);
        return { found: false, data: null, message: "Search failed. Please try again later." };
      }
    }),

  submit: authedQuery
    .input(
      z.object({
        sl: z.string().min(1),
        type: z.enum(["fuel_bill", "petty_cash"]),
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

        const row = [
          now,
          userEmail,
          userName,
          input.sl,
          input.type,
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
          `${env.sheet2OutputTab}!A:M`,
          [row]
        );

        return { success: true, message: "Data submitted successfully" };
      } catch (error) {
        console.error("[sheets] Submit error:", error);
        return { success: false, message: "Failed to submit data. Please try again later." };
      }
    }),
});
