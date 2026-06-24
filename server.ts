import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Import Cloud SQL / Drizzle resources with full extensions
import { db } from "./src/db/index.ts";
import { records, users, documents, auditLogs, notifications, theoryOfChange } from "./src/db/schema.ts";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth, AuthRequest, requireAdmin } from "./src/middleware/auth.ts";

dotenv.config();

const app = express();
const PORT = 3000;

// Duplicate typescript interfaces locally for type-safety inside API controllers
interface RecordItem {
  id: string;
  partner: string;
  theme: string;
  country: string;
  region: string;
  level: string;
  disease: string;
  evidence: string;
  resultType: 'Policy change' | 'Service delivery' | 'Capacity building' | 'Research output' | 'Community engagement' | 'System strengthening';
  reached: number;
  confidence: 'High' | 'Medium' | 'Low';
  source: string;
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  submittedBy?: string;
  submittedByRole?: string;
  approvedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const demoRecords: RecordItem[] = [
  {
    id: "demo-benin",
    partner: "Benin Ministry of Health",
    theme: "Case detection",
    country: "Benin",
    region: "Zou and Atlantique",
    level: "District",
    disease: "Buruli ulcer",
    evidence: "Health workers trained on early detection and referral pathways updated across two departments.",
    resultType: "Capacity building",
    reached: 3450,
    confidence: "High",
    source: "Partner quarterly report",
    updatedAt: new Date().toISOString(),
    updatedBy: undefined
  },
  {
    id: "demo-ghana",
    partner: "Ghana Health Service",
    theme: "Policy and governance",
    country: "Ghana",
    region: "National",
    level: "National",
    disease: "Multiple skin NTDs",
    evidence: "Skin NTD indicators incorporated into the national neglected tropical disease review process.",
    resultType: "Policy change",
    reached: 0,
    confidence: "Medium",
    source: "Workshop minutes",
    updatedAt: new Date().toISOString(),
    updatedBy: undefined
  },
  {
    id: "demo-togo",
    partner: "Togo civil society coalition",
    theme: "Civil society capacity",
    country: "Togo",
    region: "Maritime",
    level: "Subnational",
    disease: "Leprosy",
    evidence: "Community organisations adopted a shared results template and began monthly referral reporting.",
    resultType: "Community engagement",
    reached: 980,
    confidence: "Medium",
    source: "Excel tracker",
    updatedAt: new Date().toISOString(),
    updatedBy: undefined
  },
  {
    id: "demo-cote-divoire",
    partner: "Cote d'Ivoire research lab",
    theme: "Research and laboratory",
    country: "Cote d'Ivoire",
    region: "Abidjan",
    level: "National",
    disease: "Yaws",
    evidence: "Laboratory protocol harmonised for sample handling, reducing incomplete diagnostic forms.",
    resultType: "Research output",
    reached: 0,
    confidence: "High",
    source: "Technical report",
    updatedAt: new Date().toISOString(),
    updatedBy: undefined
  },
  {
    id: "demo-senegal",
    partner: "Senegal district health teams",
    theme: "Community engagement",
    country: "Senegal",
    region: "Kedougou",
    level: "Community",
    disease: "Multiple skin NTDs",
    evidence: "Peer educators held stigma reduction sessions and increased acceptance of referral visits.",
    resultType: "Community engagement",
    reached: 2120,
    confidence: "High",
    source: "Field narrative",
    updatedAt: new Date().toISOString(),
    updatedBy: undefined
  },
  {
    id: "demo-liberia",
    partner: "Liberia county health office",
    theme: "Health system strengthening",
    country: "Liberia",
    region: "Bong County",
    level: "Subnational",
    disease: "Lymphatic filariasis",
    evidence: "County teams started using a single reporting form for morbidity management follow-up.",
    resultType: "System strengthening",
    reached: 760,
    confidence: "Low",
    source: "Word report",
    updatedAt: new Date().toISOString(),
    updatedBy: undefined
  }
];

// Seed initial database state if records are empty
async function seedDatabaseIfEmpty() {
  try {
    const existingRecords = await db.select().from(records).limit(1);
    if (existingRecords.length === 0) {
      console.log("PostgreSQL Clinical Records database is empty. Seeding initial regional items...");
      
      // Upsert default system operator to avoid FK reference errors
      const systemUid = "demo-system";
      await db.insert(users)
        .values({
          uid: systemUid,
          email: "system@anesvad.org",
          name: "Anesvad Regional System Auditor",
          role: "Admin",
          org: "Anesvad HQ"
        })
        .onConflictDoNothing();

      // Insert clinical records
      await db.insert(records).values(
        demoRecords.map((r) => ({
          id: r.id,
          partner: r.partner,
          theme: r.theme,
          country: r.country,
          region: r.region,
          level: r.level,
          disease: r.disease,
          evidence: r.evidence,
          resultType: r.resultType,
          reached: r.reached,
          confidence: r.confidence,
          source: r.source,
          updatedAt: new Date(r.updatedAt || Date.now()),
          updatedBy: systemUid,
        }))
      );
      console.log("Database seed successfully initialized!");
    }
  } catch (err) {
    console.error("Failed to seed PostgreSQL database:", err);
  }
}

// Lazy initialize Gemini API client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in the workspace environment.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiInstance;
}

// Express parsing
app.use(express.json({ limit: "50mb" }));

// Helper to log user audits in the database
async function createAuditLog(
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESET' | 'SYNC',
  tableName: string,
  recordId: string,
  oldVal: any,
  newVal: any,
  uid: string | null = null,
  req: express.Request | null = null
) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || null) : null;
    const ua = req ? (req.headers['user-agent'] || null) : null;
    await db.insert(auditLogs).values({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      action,
      tableName,
      recordId,
      oldValue: oldVal ? JSON.stringify(oldVal) : null,
      newValue: newVal ? JSON.stringify(newVal) : null,
      performedBy: uid,
      ipAddress: ip,
      userAgent: ua,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Failed to insert audit log entry:", err);
  }
}

// Auth Sync Profile: Called by client after authenticating to save selected role/org
app.post("/api/auth/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, role, org } = req.body;
    if (!name || !role || !org) {
      return res.status(400).json({ error: "Name, role, and organization are required." });
    }

    const updated = await db.insert(users)
      .values({
        uid: req.user!.uid,
        email: req.user!.email || 'unknown@anesvad.org',
        name,
        role,
        org,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { name, role, org },
      })
      .returning();

    res.json({ success: true, user: updated[0] });
  } catch (error: any) {
    console.error("Failed to sync profile:", error);
    res.status(500).json({ error: "Failed to sync user profile. " + error.message });
  }
});

// Auth Verification: Validate existing session tokens
app.post("/api/auth/verify", requireAuth, async (req: AuthRequest, res) => {
  res.json({ success: true, user: req.dbUser });
});

// Retrieve all structural records
app.get("/api/records", async (req, res) => {
  try {
    const results = await db.select().from(records).orderBy(desc(records.updatedAt));
    const formatted: RecordItem[] = results.map(r => ({
      id: r.id,
      partner: r.partner,
      theme: r.theme,
      country: r.country,
      region: r.region,
      level: r.level,
      disease: r.disease,
      evidence: r.evidence,
      resultType: r.resultType as any,
      reached: r.reached,
      confidence: r.confidence as 'High' | 'Medium' | 'Low',
      source: r.source,
      approvalStatus: r.approvalStatus as 'Pending' | 'Approved' | 'Rejected' | undefined,
      submittedBy: r.submittedBy || undefined,
      submittedByRole: r.submittedByRole || undefined,
      approvedBy: r.approvedBy || undefined,
      updatedAt: r.updatedAt.toISOString(),
      updatedBy: r.updatedBy || undefined
    }));
    res.json({ records: formatted });
  } catch (error: any) {
    console.error("Database query /api/records failed:", error);
    res.status(500).json({ error: "Database query failed. Please try again later." });
  }
});

// Create or update a single record
app.post("/api/records", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const item: RecordItem = req.body.record;
    if (!item || !item.id) {
      return res.status(400).json({ error: "Record item containing ID is required." });
    }

    // Inspect if record already exists for audit logs
    const existing = await db.select().from(records).where(eq(records.id, item.id)).limit(1).then(rows => rows[0]);

    const result = await db.insert(records)
      .values({
        id: item.id,
        partner: item.partner,
        theme: item.theme,
        country: item.country,
        region: item.region,
        level: item.level,
        disease: item.disease,
        evidence: item.evidence,
        resultType: item.resultType,
        reached: item.reached,
        confidence: item.confidence,
        source: item.source,
        approvalStatus: item.approvalStatus || 'Pending',
        submittedBy: item.submittedBy || undefined,
        submittedByRole: item.submittedByRole || undefined,
        approvedBy: item.approvedBy || undefined,
        updatedAt: new Date(item.updatedAt || Date.now()),
        updatedBy: req.user!.uid,
      })
      .onConflictDoUpdate({
        target: records.id,
        set: {
          partner: item.partner,
          theme: item.theme,
          country: item.country,
          region: item.region,
          level: item.level,
          disease: item.disease,
          evidence: item.evidence,
          resultType: item.resultType,
          reached: item.reached,
          confidence: item.confidence,
          source: item.source,
          approvalStatus: item.approvalStatus || 'Pending',
          submittedBy: item.submittedBy || undefined,
          submittedByRole: item.submittedByRole || undefined,
          approvedBy: item.approvedBy || undefined,
          updatedAt: new Date(),
          updatedBy: req.user!.uid,
        }
      })
      .returning();

    // Log the audit trait
    if (existing) {
      await createAuditLog('UPDATE', 'records', item.id, existing, result[0], req.user!.uid, req);
    } else {
      await createAuditLog('CREATE', 'records', item.id, null, result[0], req.user!.uid, req);
    }

    res.json({ success: true, record: result[0] });
  } catch (error: any) {
    console.error("Database create /api/records failed:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Delete a single record
app.delete("/api/records/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = await db.select().from(records).where(eq(records.id, id)).limit(1).then(rows => rows[0]);
    if (!existing) {
      return res.status(404).json({ error: "Record not found in the database." });
    }

    await db.delete(records).where(eq(records.id, id));
    
    // Log the audit auditLog
    await createAuditLog('DELETE', 'records', id, existing, null, req.user!.uid, req);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Database delete /api/records failed:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Synchronize: Pull centralized data
app.get("/api/sync/pull", async (req, res) => {
  try {
    const results = await db.select().from(records).orderBy(desc(records.updatedAt));
    const formatted: RecordItem[] = results.map(r => ({
      id: r.id,
      partner: r.partner,
      theme: r.theme,
      country: r.country,
      region: r.region,
      level: r.level,
      disease: r.disease,
      evidence: r.evidence,
      resultType: r.resultType as any,
      reached: r.reached,
      confidence: r.confidence as 'High' | 'Medium' | 'Low',
      source: r.source,
      approvalStatus: r.approvalStatus as 'Pending' | 'Approved' | 'Rejected' | undefined,
      submittedBy: r.submittedBy || undefined,
      submittedByRole: r.submittedByRole || undefined,
      approvedBy: r.approvedBy || undefined,
      updatedAt: r.updatedAt.toISOString(),
      updatedBy: r.updatedBy || undefined
    }));
    res.json({ records: formatted });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to pull records: " + err.message });
  }
});

// Synchronize: Push and merge local edits
app.post("/api/sync/push", requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientRecords: RecordItem[] = req.body.records || [];
    let added = 0;
    let updated = 0;

    for (const item of clientRecords) {
      const existing = await db.select().from(records).where(eq(records.id, item.id)).limit(1).then(rows => rows[0]);
      
      const newVal = {
        id: item.id,
        partner: item.partner,
        theme: item.theme,
        country: item.country,
        region: item.region,
        level: item.level,
        disease: item.disease,
        evidence: item.evidence,
        resultType: item.resultType,
        reached: item.reached,
        confidence: item.confidence,
        source: item.source,
        approvalStatus: item.approvalStatus || 'Pending',
        submittedBy: item.submittedBy || undefined,
        submittedByRole: item.submittedByRole || undefined,
        approvedBy: item.approvedBy || undefined,
        updatedAt: new Date(item.updatedAt || Date.now()),
        updatedBy: req.user!.uid,
      };

      if (existing) {
        const existingTime = existing.updatedAt.getTime();
        const clientTime = newVal.updatedAt.getTime();

        if (clientTime >= existingTime) {
          await db.update(records)
            .set({
              ...newVal,
              updatedAt: new Date() // Use current server sync timestamp
            })
            .where(eq(records.id, item.id));
          updated++;
          await createAuditLog('SYNC', 'records', item.id, existing, newVal, req.user!.uid, req);
        }
      } else {
        await db.insert(records).values(newVal);
        added++;
        await createAuditLog('SYNC', 'records', item.id, null, newVal, req.user!.uid, req);
      }
    }

    // Return the updated aggregated list
    const results = await db.select().from(records).orderBy(desc(records.updatedAt));
    const formatted: RecordItem[] = results.map(r => ({
      id: r.id,
      partner: r.partner,
      theme: r.theme,
      country: r.country,
      region: r.region,
      level: r.level,
      disease: r.disease,
      evidence: r.evidence,
      resultType: r.resultType as any,
      reached: r.reached,
      confidence: r.confidence as 'High' | 'Medium' | 'Low',
      source: r.source,
      approvalStatus: r.approvalStatus as 'Pending' | 'Approved' | 'Rejected' | undefined,
      submittedBy: r.submittedBy || undefined,
      submittedByRole: r.submittedByRole || undefined,
      approvedBy: r.approvedBy || undefined,
      updatedAt: r.updatedAt.toISOString(),
      updatedBy: r.updatedBy || undefined
    }));

    res.json({
      success: true,
      added,
      updated,
      records: formatted
    });
  } catch (error: any) {
    console.error("Central synchronization push collapsed:", error);
    res.status(500).json({ error: "Failed to push and merge and records: " + error.message });
  }
});

// Reset clinical dataset to West African defaults
app.post("/api/records/reset", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Purge clinical records
    await db.delete(records);

    // Insert structural default records
    await db.insert(records).values(
      demoRecords.map((r) => ({
        id: r.id,
        partner: r.partner,
        theme: r.theme,
        country: r.country,
        region: r.region,
        level: r.level,
        disease: r.disease,
        evidence: r.evidence,
        reached: r.reached,
        confidence: r.confidence,
        source: r.source,
        updatedAt: new Date(),
        updatedBy: req.user!.uid,
      }))
    );

    await createAuditLog('RESET', 'records', 'ALL', null, { demo: true }, req.user!.uid, req);

    res.json({ success: true, records: demoRecords });
  } catch (error: any) {
    console.error("Failed to reset operational records:", error);
    res.status(500).json({ error: "Failed to reset database to prepackaged default markers: " + error.message });
  }
});

// Document archival endpoint list
app.get("/api/documents", async (req, res) => {
  try {
    const list = await db.select().from(documents).orderBy(desc(documents.uploadedAt));
    res.json({ success: true, documents: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Document archival upload
app.post("/api/documents", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const doc = req.body.document;
    if (!doc || !doc.id) {
      return res.status(400).json({ error: "Document item required" });
    }

    await db.insert(documents).values({
      id: doc.id,
      fileName: doc.fileName,
      size: doc.size,
      source: doc.source,
      extractedCount: doc.extractedCount,
      status: doc.status,
      uploadedAt: new Date(),
      content: doc.content || null
    });

    await createAuditLog('CREATE', 'documents', doc.id, null, doc, req.user!.uid, req);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Document removal
app.delete("/api/documents/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(documents).where(eq(documents.id, id)).limit(1).then(rows => rows[0]);
    if (!existing) {
      return res.status(404).json({ error: "Document not found" });
    }

    await db.delete(documents).where(eq(documents.id, id));

    await createAuditLog('DELETE', 'documents', id, existing, null, req.user!.uid, req);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Classify Text using Gemini 3.5 Flash Schema Extraction
app.post("/api/classify", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text prompt is required for classification." });
    }

    const ai = getGeminiClient();
    
    const prompt = `You are an expert Neglected Tropical Diseases (NTD) data analyst working for Anesvad. 
Extract structured NTD intervention data from the following unstructured excerpt:
"${text}"

Ensure the theme, level, and disease are mapped accurately to Anesvad's formal taxonomy:
- Themes: "Case detection", "Health system strengthening", "Community engagement", "Research and laboratory", "Policy and governance", "Civil society capacity"
- Levels: "Community", "District", "Subnational", "National", "Regional"
- Diseases: "Buruli ulcer", "Leprosy", "Yaws", "Lymphatic filariasis", "Multiple skin NTDs"
- Confidence: Assess as "High" (fully documented, complete), "Medium" (some details missing), or "Low" (narrative excerpt with sparse data).
- Reached: Look for numeric counts of individuals treated, screened, trained, reached, or diagnosed. Default to 0 if not stated.
- Source: A short name for the document/excerpt type like "Excerpt Field Notes", "Pasted Narrative Log" etc.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            partner: { type: Type.STRING, description: "Name of the partner organization, ministry, clinical lab, or NGO." },
            country: { type: Type.STRING, description: "Country. Prefer West African countries: Benin, Ghana, Togo, Cote d'Ivoire, Senegal, Liberia, etc." },
            region: { type: Type.STRING, description: "States, provinces, departments, or districts mentioned." },
            theme: { type: Type.STRING, description: "Must map exactly to one of the Anesvad Themes." },
            level: { type: Type.STRING, description: "Must map exactly to one of the Anesvad intervention levels." },
            disease: { type: Type.STRING, description: "Must map exactly to one of the Anesvad Disease Focus items." },
            reached: { type: Type.INTEGER, description: "Total people targeted, reached, treated, or trained. 0 if unspecified." },
            confidence: { type: Type.STRING, description: '"High", "Medium", or "Low"' },
            evidence: { type: Type.STRING, description: "The central results breakthrough, outcome achieved, or change evidence." },
            source: { type: Type.STRING, description: "Where the text source came from." }
          },
          required: ["partner", "country", "region", "theme", "level", "disease", "reached", "confidence", "evidence", "source"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response returned from Gemini Content Generator.");
    }

    const structuredData = JSON.parse(resultText);
    res.json({ success: true, result: structuredData });
  } catch (error: any) {
    console.error("Gemini Classify API error:", error);
    res.status(500).json({ error: error.message || "Failed to classify text." });
  }
});

// AI Insights Generator using Gemini 3.5 Flash
app.post("/api/insights", async (req, res) => {
  try {
    const { records: clientRecs } = req.body;
    let finalRecords = clientRecs;

    // Fall back to database records if client-provided lists are absent
    if (!finalRecords || !Array.isArray(finalRecords) || finalRecords.length === 0) {
      const dbResults = await db.select().from(records);
      finalRecords = dbResults;
    }

    const ai = getGeminiClient();

    const dataContext = JSON.stringify(finalRecords.map(r => ({
      partner: r.partner,
      country: r.country,
      theme: r.theme,
      level: r.level,
      disease: r.disease,
      reached: r.reached,
      confidence: r.confidence,
      evidence: r.evidence
    })), null, 2);

    const prompt = `You are a Neglected Tropical Disease (NTD) advisory bot at Anesvad.
Analyze the following active database of health intervention results:
${dataContext}

Provide three clear, high-level analytic outputs in a strict structured JSON format:
1. Portfolio pattern: Highlight thematic or geographic concentrations, who are the main players, and what major gaps look prominent inside the results.
2. Data quality: Comment on general confidence distribution, and warn about any inconsistencies, missing numbers, or areas with sparse confirmation.
3. Suggested next step: Recommend a concrete, actionable research, field work, or policy priority for Anesvad to initiate in West Africa next based on these findings.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pattern: { type: Type.STRING, description: "Paragraph reviewing thematic concentration and strategic trends in West Africa." },
            quality: { type: Type.STRING, description: "Paragraph reviewing data confidence, evidence levels, and reporting completeness." },
            nextStep: { type: Type.STRING, description: "Paragraph detailing concrete audits, surveys, or field recommendations for Anesvad." }
          },
          required: ["pattern", "quality", "nextStep"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response body produced by Gemini.");
    }

    const insights = JSON.parse(resultText);
    res.json({ success: true, insights });
  } catch (error: any) {
    console.error("Gemini Insights API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI insights." });
  }
});

// AI Theory of Change generator
app.post("/api/toc/generate", async (req, res) => {
  try {
    const { text, projectName, sourceDocument } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Project narrative text is required." });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert Theory of Change architect for international development and NTD programming.
Extract a structured Theory of Change from the following project narrative. Identify inputs, activities, outputs, outcomes, intermediate outcomes, long-term outcomes, impact, assumptions, risks, and measurable indicators.

Project narrative:
"${text}"

Return only valid JSON with these fields: projectName, sourceDocument, description, inputs, activities, outputs, outcomes, intermediateOutcomes, longTermOutcomes, impact, assumptions, risks, indicators.
Use concise yet rich statements suitable for NGO logframes and monitoring frameworks.
For each indicator, include title, definition, formula, dataSource, frequency, baseline, target.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING },
            sourceDocument: { type: Type.STRING },
            description: { type: Type.STRING },
            inputs: { type: Type.ARRAY, items: { type: Type.STRING } },
            activities: { type: Type.ARRAY, items: { type: Type.STRING } },
            outputs: { type: Type.ARRAY, items: { type: Type.STRING } },
            outcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
            intermediateOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
            longTermOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
            impact: { type: Type.STRING },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            indicators: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  formula: { type: Type.STRING },
                  dataSource: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  baseline: { type: Type.STRING },
                  target: { type: Type.STRING }
                },
                required: ["title", "definition", "formula", "dataSource", "frequency", "baseline", "target"]
              }
            }
          },
          required: ["projectName", "sourceDocument", "description", "inputs", "activities", "outputs", "outcomes", "longTermOutcomes", "impact", "assumptions", "risks", "indicators"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response returned from Gemini Content Generator.");
    }

    const toc = JSON.parse(resultText);
    const record = {
      id: `toc-${Date.now()}`,
      projectName: toc.projectName || projectName || 'NTD Theory of Change',
      sourceDocument: toc.sourceDocument || sourceDocument || 'Project narrative',
      description: toc.description || '',
      narrative: text,
      tocJson: JSON.stringify(toc),
      createdAt: new Date(),
      createdBy: null,
      updatedAt: new Date(),
      updatedBy: null
    };

    await db.insert(theoryOfChange).values(record);
    res.json({ success: true, toc });
  } catch (error: any) {
    console.error("Gemini ToC API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate Theory of Change." });
  }
});

// SPA Static assets or Vite Middleware routing
async function initServer() {
  // Pre-seed the database if it is empty at boot
  await seedDatabaseIfEmpty();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Anesvad Results Hub Server running at http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((e) => {
  console.error("Critical error starting Express and Vite server:", e);
});
