import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { count, desc, eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db, remittancesTable } from "@workspace/db";
import {
  GetAdminSummaryHeader,
  GetAdminSummaryResponse,
  ImportRemittancesHeader,
  ImportRemittancesBody,
  ImportRemittancesResponse,
  QueryRemittanceQueryParams,
  QueryRemittanceResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const requestWindowMs = 60_000;
const requestLimit = 5;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

type ParsedRow = {
  employeeCode: string;
  transferNumber: string;
  currency: string;
  sender: string;
  beneficiary: string;
};

function sameSecret(candidate: string | undefined, expected: string | undefined): boolean {
  if (!candidate || !expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

function isAdmin(req: Request): boolean {
  return sameSecret(req.header("x-admin-key"), process.env.ADMIN_UPLOAD_KEY);
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(ip);
  if (!current || current.resetAt <= now) {
    requestCounts.set(ip, { count: 1, resetAt: now + requestWindowMs });
    return false;
  }
  current.count += 1;
  return current.count > requestLimit;
}

function normalizeEmployeeCode(value: string): string {
  return value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function cleanCell(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === "," || char === "\t") && !inQuotes) {
      values.push(cleanCell(value));
      value = "";
    } else {
      value += char;
    }
  }
  values.push(cleanCell(value));
  return values;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '""';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.trim()) rows.push(parseCsvLine(current));
      current = "";
      if (char === "\r" && next === "\n") index += 1;
    } else {
      current += char;
    }
  }
  if (current.trim()) rows.push(parseCsvLine(current));
  return rows;
}

function rowsToRemittances(rows: string[][]): ParsedRow[] {
  if (rows.length < 2) throw new Error("يجب أن يحتوي الملف على صف عناوين وصف واحد على الأقل.");
  const header = rows[0].map(cleanCell);
  const headerNames = ["رقم كود الموظف", "رقم الحوالة", "العملة", "المرسل", "المستلم"];
  const indexes = headerNames.map((name) => header.indexOf(name));
  if (indexes.some((index) => index < 0)) {
    throw new Error("أعمدة الملف يجب أن تكون: رقم كود الموظف، رقم الحوالة، العملة، المرسل، المستلم.");
  }

  const seen = new Set<string>();
  const parsed = rows.slice(1).map((row, rowIndex) => {
    const values = indexes.map((index) => cleanCell(row[index]));
    if (values.some((value) => !value)) {
      throw new Error(`يوجد حقل فارغ في الصف رقم ${rowIndex + 2}.`);
    }
    const [employeeCode, transferNumber, currency, sender, beneficiary] = values;
    if (seen.has(employeeCode)) {
      throw new Error(`كود الموظف مكرر في الصف رقم ${rowIndex + 2}.`);
    }
    seen.add(employeeCode);
    return { employeeCode, transferNumber, currency, sender, beneficiary };
  });

  if (!parsed.length) throw new Error("لم يتم العثور على سجلات قابلة للاستيراد.");
  return parsed;
}

function decodeImport(fileName: string, content: string, encoding: "utf-8" | "base64"): ParsedRow[] {
  const lowerName = fileName.toLowerCase();
  if (encoding === "base64" || lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const workbook = XLSX.read(content, { type: "base64" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("تعذر قراءة ورقة البيانات من ملف Excel.");
    const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    return rowsToRemittances(rows.map((row) => row.map(cleanCell)));
  }
  return rowsToRemittances(parseCsv(content));
}

function clearExpiredRateLimits(): void {
  const now = Date.now();
  for (const [ip, value] of requestCounts) {
    if (value.resetAt <= now) requestCounts.delete(ip);
  }
}

setInterval(clearExpiredRateLimits, requestWindowMs).unref();

router.get("/remittances/query", async (req, res): Promise<void> => {
  const rawEmployeeCode = req.query.employeeCode;
  const sanitizedQuery =
    typeof rawEmployeeCode === "string"
      ? { ...req.query, employeeCode: normalizeEmployeeCode(rawEmployeeCode) }
      : req.query;
  const parsedParams = QueryRemittanceQueryParams.safeParse(sanitizedQuery);
  if (!parsedParams.success) {
    res.status(400).json({ error: "رقم كود الموظف غير صالح." });
    return;
  }
  if (isRateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "تم تجاوز عدد محاولات البحث مؤقتًا. حاول لاحقًا." });
    return;
  }

  const [record] = await db
    .select({
      employeeCode: remittancesTable.employeeCode,
      transferNumber: remittancesTable.transferNumber,
      currency: remittancesTable.currency,
      sender: remittancesTable.sender,
      beneficiary: remittancesTable.beneficiary,
    })
    .from(remittancesTable)
    .where(eq(remittancesTable.employeeCode, parsedParams.data.employeeCode))
    .limit(1);

  if (!record) {
    res.status(404).json({ error: "لم يتم العثور على حوالة مرتبطة بهذا الكود." });
    return;
  }

  res.json(QueryRemittanceResponse.parse(record));
});

router.get("/remittances/admin/summary", async (req, res): Promise<void> => {
  const parsedHeader = GetAdminSummaryHeader.safeParse({
    "x-admin-key": req.header("x-admin-key"),
  });
  if (!parsedHeader.success || !isAdmin(req)) {
    res.status(401).json({ error: "مفتاح الإدارة غير صالح." });
    return;
  }

  const [summary] = await db
    .select({
      recordCount: count(remittancesTable.id),
      fileName: remittancesTable.sourceFileName,
      updatedAt: remittancesTable.updatedAt,
    })
    .from(remittancesTable)
    .groupBy(remittancesTable.sourceFileName, remittancesTable.updatedAt)
    .orderBy(desc(remittancesTable.updatedAt))
    .limit(1);

  const data = {
    recordCount: Number(summary?.recordCount ?? 0),
    fileName: summary?.fileName ?? null,
    updatedAt: summary?.updatedAt?.toISOString() ?? null,
  };
  res.json(GetAdminSummaryResponse.parse(data));
});

router.post("/remittances/admin/import", async (req, res): Promise<void> => {
  const parsedHeader = ImportRemittancesHeader.safeParse({
    "x-admin-key": req.header("x-admin-key"),
  });
  if (!parsedHeader.success || !isAdmin(req)) {
    res.status(401).json({ error: "مفتاح الإدارة غير صالح." });
    return;
  }
  const parsedBody = ImportRemittancesBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "بيانات الملف غير صالحة." });
    return;
  }

  let records: ParsedRow[];
  try {
    records = decodeImport(
      parsedBody.data.fileName,
      parsedBody.data.content,
      parsedBody.data.encoding,
    );
  } catch (error) {
    req.log.warn({ error }, "Rejected remittance import");
    res.status(400).json({
      error: error instanceof Error ? error.message : "تعذر قراءة الملف.",
    });
    return;
  }

  const updatedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(remittancesTable);
    await tx.insert(remittancesTable).values(
      records.map((record) => ({
        ...record,
        sourceFileName: parsedBody.data.fileName,
        updatedAt,
      })),
    );
  });

  res.json(
    ImportRemittancesResponse.parse({
      importedCount: records.length,
      fileName: parsedBody.data.fileName,
      updatedAt: updatedAt.toISOString(),
    }),
  );
});

export default router;