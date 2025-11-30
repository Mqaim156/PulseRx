// server.js (ESM) - FIXED VERSION

// --- Imports ---
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// --- Basic app setup ---
const app = express();
const PORT = process.env.PORT || 4000;

// --- CORS Configuration (MUST come BEFORE routes) ---
const corsOptions = {
  origin: [
    'https://mqaim156.github.io',
    'https://mqaim156.github.io/PulseRx',  // Subdirectory ⭐ ADD THIS
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// 🔧 Normalize any leading multiple slashes so //api/... becomes /api/...
app.use((req, res, next) => {
  if (req.path.startsWith('//')) {
    const original = req.url;
    const [path, query = ''] = original.split('?');
    const normalizedPath = path.replace(/^\/+/, '/'); // //api -> /api
    req.url = normalizedPath + (query ? `?${query}` : '');
  }
  next();
});


// --- Health Check Endpoint (Important for Render) ---
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'PulseRx Server is running',
    mongodb: client.topology?.isConnected() ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'PulseRx API Server',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'GET /api/patients',
      'POST /api/patients',
      'GET /api/visits',
      'POST /api/visits',
      'GET /api/bp-readings/latest',
      'GET /api/bp-readings/trend',
      'POST /api/bp-readings'
    ]
  });
});

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
    console.log('✅ Connected to MongoDB (visits)');
  }
  const db = client.db('medical_hackathon_db');
  return db.collection('visits');
}

// Helper to get BP readings collection
async function getBpCollection() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log('✅ Connected to MongoDB (BP readings)');
  }
  const db = client.db('medical_hackathon_db');
  return db.collection('bp_readings');
}

// --- Gemini / SOAP note setup ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GOOGLE_API_KEY or GEMINI_API_KEY in environment.');
  console.error('   Add it in your Render dashboard under Environment Variables');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

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
    console.warn('⚠️ Transcript too short for SOAP note.');
    return {
      patient_summary: 'Transcript too short for analysis.',
      subjective: [],
      objective: [],
      assessment: 'Insufficient information.',
      plan: ['Review the full conversation manually.'],
    };
  }

  console.log('🧠 Sending transcript to Gemini for SOAP note...');

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
    console.log('📝 Raw Gemini response received');

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

    console.log('✅ SOAP note generated successfully');
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

// --- API Routes ---

// Save visit + generate SOAP note
app.post('/api/visits', async (req, res) => {
  try {
    const visitsCollection = await getVisitsCollection();

    const {
      patient_id,
      timestamp,
      raw_transcript,
      audio_recording,
      audio_mime_type,
      status,
      clinical_note,
    } = req.body;

    if (!patient_id || !raw_transcript) {
      console.warn('⚠️ Missing required fields:', { patient_id, raw_transcript });
      return res
        .status(400)
        .json({ ok: false, error: 'patient_id and raw_transcript are required' });
    }

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

    const note = await generateSoapNote(raw_transcript);

    await visitsCollection.updateOne(
      { _id: insertResult.insertedId },
      {
        $set: {
          clinical_note: note,
          status: 'completed',
        },
      }
    );

    console.log('✅ Visit saved with SOAP note');

    res.status(201).json({
      ok: true,
      id: insertResult.insertedId,
      clinical_note: note,
    });
  } catch (err) {
    console.error('🔥 Error saving visit:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || 'Server error saving visit' 
    });
  }
});

// Fetch visits
app.get('/api/visits', async (req, res) => {
  try {
    const visitsCollection = await getVisitsCollection();
    const { patient_id } = req.query;

    const query = patient_id ? { patient_id: String(patient_id) } : {};

    const visits = await visitsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    console.log(`✅ Fetched ${visits.length} visits`);
    res.json({ ok: true, visits });
  } catch (err) {
    console.error('🔥 Error fetching visits:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || 'Server error fetching visits' 
    });
  }
});

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    console.log('📋 GET /api/patients - Fetching patients...');
    const patientsCollection = await getPatientsCollection();

    const docs = await patientsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const patients = docs.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      condition: doc.condition || 'N/A',
      riskStatus: doc.riskStatus || 'LOW',
      adherence: typeof doc.adherence === 'number' ? doc.adherence : 100,
      lastBP: doc.lastBP || '—',
      lastCheck: doc.lastCheck || '—',
    }));

    console.log(`✅ Returning ${patients.length} patients`);
    res.json({ ok: true, patients });
  } catch (err) {
    console.error('🔥 Error fetching patients:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || 'Server error fetching patients' 
    });
  }
});

// Create a new patient
app.post('/api/patients', async (req, res) => {
  try {
    console.log('➕ POST /api/patients - Creating patient...');
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

    console.log(`✅ Patient created: ${doc.name}`);
    res.status(201).json({
      ok: true,
      patient: {
        ...doc,
        id: String(result.insertedId),
      },
    });
  } catch (err) {
    console.error('🔥 Error creating patient:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || 'Server error creating patient' 
    });
  }
});

// Log a new BP reading
app.post('/api/bp-readings', async (req, res) => {
  try {
    const bpCollection = await getBpCollection();
    const { patient_id, systolic, diastolic, timestamp } = req.body;

    if (!patient_id || systolic == null || diastolic == null) {
      return res.status(400).json({
        ok: false,
        error: 'patient_id, systolic, and diastolic are required'
      });
    }

    const doc = {
      patient_id: String(patient_id),
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    const result = await bpCollection.insertOne(doc);
    console.log(`✅ BP reading saved for patient ${patient_id}`);
    
    res.status(201).json({ 
      ok: true, 
      reading: { ...doc, _id: result.insertedId } 
    });
  } catch (err) {
    console.error('🔥 Error saving BP reading:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || 'Server error saving BP reading' 
    });
  }
});

// Get latest BP reading
app.get('/api/bp-readings/latest', async (req, res) => {
  try {
    const bpCollection = await getBpCollection();
    const { patient_id } = req.query;

    if (!patient_id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'patient_id is required' 
      });
    }

    const reading = await bpCollection.findOne(
      { patient_id: String(patient_id) },
      { sort: { timestamp: -1 } }
    );

    res.json({ ok: true, reading: reading || null });
  } catch (err) {
    console.error('🔥 Error fetching latest BP:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || 'Server error fetching latest BP' 
    });
  }
});

// Get BP trend data
app.get('/api/bp-readings/trend', async (req, res) => {
  try {
    const bpCollection = await getBpCollection();
    const { patient_id, limit } = req.query;

    if (!patient_id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'patient_id is required' 
      });
    }

    const max = Number(limit) || 30;

    const readings = await bpCollection
      .find({ patient_id: String(patient_id) })
      .sort({ timestamp: 1 })
      .limit(max)
      .toArray();

    console.log(`✅ Fetched ${readings.length} BP readings for patient ${patient_id}`);
    res.json({ ok: true, readings });
  } catch (err) {
    console.error('🔥 Error fetching BP trend:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || 'Server error fetching BP trend' 
    });
  }
});

// 404 handler
app.use((req, res) => {
  console.log(`⚠️ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    ok: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api/patients',
      'POST /api/patients',
      'GET /api/visits',
      'POST /api/visits'
    ]
  });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 PulseRx Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🗄️  MongoDB: ${MONGO_URI.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local'}`);
  console.log(`🤖 Gemini: ${GEMINI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log('='.repeat(50));
  console.log('✅ Ready to accept requests');
  console.log('📝 Try: curl http://localhost:' + PORT + '/health');
  console.log('='.repeat(50));
});