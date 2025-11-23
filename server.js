// server.js (ESM)

// --- Imports ---
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { GoogleGenAI } from '@google/genai';

// --- Basic app setup ---
const app = express();
const PORT = process.env.PORT || 4000;

// --- MongoDB setup ---
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://hackrx:hackrx5624@cluster0.sxixgk7.mongodb.net/?appName=Cluster0';

const client = new MongoClient(MONGO_URI);

// Helper to get the patients collection
async function getPatientsCollection() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log('✅ Connected to MongoDB (patients)');
  }
  const db = client.db('medical_hackathon_db');
  return db.collection('patients');
}


// Helper to get the visits collection
async function getVisitsCollection() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log('✅ Connected to MongoDB');
  }
  const db = client.db('medical_hackathon_db');
  return db.collection('visits');
}

// NEW: helper to get BP readings collection
async function getBpCollection() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log('✅ Connected to MongoDB (BP readings)');
  }
  const db = client.db('medical_hackathon_db');
  return db.collection('bp_readings');
}

app.use(cors());
app.use(express.json({ limit: '50mb' })); // allow large audio payloads

// --- Gemini / SOAP note setup ---

// Try both GOOGLE_API_KEY and GEMINI_API_KEY for convenience
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GOOGLE_API_KEY or GEMINI_API_KEY in environment.');
  console.error('   Example (PowerShell):  $env:GOOGLE_API_KEY = "YOUR_KEY_HERE"');
  process.exit(1);
}

// Create the Google GenAI client (Node SDK)
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

// Optional: system prompt (for readability)
const systemInstruction = `
You are an expert clinical documentation assistant. 
Your task is to analyze the provided doctor-patient conversation and extract a structured SOAP note.

Rules:
- SUBJECTIVE: Extract patient complaints and history. Use bullet points.
- OBJECTIVE: Extract measurable data (vitals, labs) and physical exam findings.
- ASSESSMENT:
  - Summarize the diagnosis or differential diagnosis.
  - Propose 1–3 possible conditions with brief rationale.
  - Clearly state uncertainty if the evidence is weak.
- PLAN: List next steps, medications prescribed, and follow-up instructions.
- Be concise and professional. Use medical terminology where appropriate.
- Your output will be reviewed by a licensed clinician. This is not a final diagnosis.
`;

// --- SOAP note generator using Gemini ---
async function generateSoapNote(transcriptText) {
  if (!transcriptText || transcriptText.length < 10) {
    console.warn('Transcript too short for SOAP note.');
    return {
      patient_summary: 'Transcript too short for analysis.',
      subjective: [],
      objective: [],
      assessment: 'Insufficient information.',
      plan: ['Review the full conversation manually.'],
    };
  }

  console.log('🧠 Sending transcript to Gemini for SOAP note...');

  // Build a single prompt that includes the rules + the transcript
  const prompt = `
${systemInstruction}

Return ONLY a valid JSON object, with this exact structure and field names:
{
  "patient_summary": "short paragraph summary of the case",
  "subjective": ["item 1", "item 2", "..."],
  "objective": ["item 1", "item 2", "..."],
  "assessment": "diagnosis or differential, including 1–3 possible conditions with brief rationale",
  "plan": ["item 1", "item 2", "..."]
}

Do not include any extra text before or after the JSON.

Conversation:
${transcriptText}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text ?? '';
    console.log('🔍 Raw Gemini response text:', raw);

    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseErr) {
      console.error('❌ Failed to parse JSON from Gemini:', parseErr);
      return {
        patient_summary: 'Analysis failed (invalid JSON from model).',
        subjective: ['Error analyzing transcript'],
        objective: [],
        assessment: 'Analysis Failed',
        plan: ['Please review raw transcript manually'],
      };
    }

    // Be forgiving: fill in defaults if some fields are missing or wrong type
    const note = {
      patient_summary:
        typeof json.patient_summary === 'string'
          ? json.patient_summary
          : 'No summary provided.',
      subjective: Array.isArray(json.subjective)
        ? json.subjective.map(String)
        : [],
      objective: Array.isArray(json.objective)
        ? json.objective.map(String)
        : [],
      assessment:
        typeof json.assessment === 'string'
          ? json.assessment
          : 'No assessment provided.',
      plan: Array.isArray(json.plan) ? json.plan.map(String) : [],
    };

    console.log('✅ SOAP note generated and normalized.');
    return note;
  } catch (err) {
    console.error('❌ Gemini SOAP generation error:', err);
    return {
      patient_summary: 'Analysis failed due to an error.',
      subjective: ['Error analyzing transcript'],
      objective: [],
      assessment: 'Analysis Failed',
      plan: ['Please review raw transcript manually'],
    };
  }
}

// --- API route: save visit + generate SOAP note ---
app.post('/api/visits', async (req, res) => {
  try {
    const visitsCollection = await getVisitsCollection();

    const {
      patient_id,
      timestamp,
      raw_transcript,
      audio_recording,
      audio_mime_type,
      status, // optional from frontend
      clinical_note, // optional from frontend (we’ll overwrite)
    } = req.body;

    if (!patient_id || !raw_transcript) {
      console.warn('⚠️ Missing required fields:', { patient_id, raw_transcript });
      return res
        .status(400)
        .send('patient_id and raw_transcript are required');
    }

    // 1) Insert base visit document (raw transcript + audio)
    const baseDoc = {
      patient_id,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      raw_transcript,
      audio_recording,
      audio_mime_type,
      status: status || 'processing',
      clinical_note: clinical_note || null,
    };

    console.log('💾 Inserting visit into MongoDB...');
    const insertResult = await visitsCollection.insertOne(baseDoc);

    // 2) Call Gemini to generate SOAP note from the transcript
    const note = await generateSoapNote(raw_transcript);

    // 3) Update the same Mongo document with the SOAP note + final status
    await visitsCollection.updateOne(
      { _id: insertResult.insertedId },
      {
        $set: {
          clinical_note: note,
          status: 'completed',
        },
      }
    );

    console.log('✅ Visit updated with SOAP note.');

    // 4) Return the ID + SOAP note to the frontend
    res.status(201).json({
      ok: true,
      id: insertResult.insertedId,
      clinical_note: note,
    });
  } catch (err) {
    console.error('🔥 Error saving visit or generating SOAP note:', err);
    res.status(500).send(err.message || 'Server error saving visit');
  }
});

// --- NEW: API route to fetch visits (for dashboard) ---
app.get('/api/visits', async (req, res) => {
  try {
    const visitsCollection = await getVisitsCollection();
    const { patient_id } = req.query;

    const query = patient_id ? { patient_id: String(patient_id) } : {};

    const visits = await visitsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    res.json({ ok: true, visits });
  } catch (err) {
    console.error('🔥 Error fetching visits:', err);
    res.status(500).send(err.message || 'Server error fetching visits');
  }
});

// --- Patients API ---

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const patientsCollection = await getPatientsCollection();

    const docs = await patientsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Map Mongo docs to the shape your frontend expects
    const patients = docs.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      condition: doc.condition || 'N/A',
      riskStatus: doc.riskStatus || 'LOW',
      adherence:
        typeof doc.adherence === 'number' ? doc.adherence : 100,
      lastBP: doc.lastBP || '—',
      lastCheck: doc.lastCheck || '—',
    }));

    res.json({ ok: true, patients });
  } catch (err) {
    console.error('🔥 Error fetching patients:', err);
    res
      .status(500)
      .send(err.message || 'Server error fetching patients');
  }
});


// Create a new patient
app.post('/api/patients', async (req, res) => {
  try {
    const { name, condition } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ ok: false, error: 'Patient name is required' });
    }

    const patientsCollection = await getPatientsCollection();

    const now = new Date();
    const doc = {
      name: name.trim(),
      condition: (condition || 'N/A').trim(),
      riskStatus: 'LOW',
      adherence: 100,
      lastBP: '—',
      lastCheck: 'Just now',
      createdAt: now,
      updatedAt: now,
    };

    const result = await patientsCollection.insertOne(doc);

    res.status(201).json({
      ok: true,
      patient: {
        ...doc,
        id: String(result.insertedId),
      },
    });
  } catch (err) {
    console.error('🔥 Error creating patient:', err);
    res.status(500).send(err.message || 'Server error creating patient');
  }
});


// --- NEW: Blood Pressure Readings API ---
// Log a new BP reading (patient portal)
app.post('/api/bp-readings', async (req, res) => {
  try {
    const bpCollection = await getBpCollection();
    const { patient_id, systolic, diastolic, timestamp } = req.body;

    if (!patient_id || systolic == null || diastolic == null) {
      return res
        .status(400)
        .send('patient_id, systolic, and diastolic are required');
    }

    const doc = {
      patient_id: String(patient_id),
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    const result = await bpCollection.insertOne(doc);
    res.status(201).json({ ok: true, reading: { ...doc, _id: result.insertedId } });
  } catch (err) {
    console.error('🔥 Error saving BP reading:', err);
    res.status(500).send(err.message || 'Server error saving BP reading');
  }
});

// Get latest BP reading per patient
app.get('/api/bp-readings/latest', async (req, res) => {
  try {
    const bpCollection = await getBpCollection();
    const { patient_id } = req.query;

    if (!patient_id) {
      return res.status(400).send('patient_id is required');
    }

    const reading = await bpCollection.findOne(
      { patient_id: String(patient_id) },
      { sort: { timestamp: -1 } }
    );

    res.json({ ok: true, reading: reading || null });
  } catch (err) {
    console.error('🔥 Error fetching latest BP:', err);
    res.status(500).send(err.message || 'Server error fetching latest BP');
  }
});

// Get BP trend data for chart
app.get('/api/bp-readings/trend', async (req, res) => {
  try {
    const bpCollection = await getBpCollection();
    const { patient_id, limit } = req.query;

    if (!patient_id) {
      return res.status(400).send('patient_id is required');
    }

    const max = Number(limit) || 30;

    const readings = await bpCollection
      .find({ patient_id: String(patient_id) })
      .sort({ timestamp: 1 })
      .limit(max)
      .toArray();

    res.json({ ok: true, readings });
  } catch (err) {
    console.error('🔥 Error fetching BP trend:', err);
    res.status(500).send(err.message || 'Server error fetching BP trend');
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});