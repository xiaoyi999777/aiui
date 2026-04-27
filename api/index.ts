import express from "express";
import OpenAI from "openai";
import multer from "multer";
import cors from "cors";

// Vercel environment doesn't need startServer() with listen()
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, chineseStyle, customApiKey, customBaseUrl } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = (customApiKey || process.env.OPENAI_API_KEY)?.trim();
    if (!apiKey) {
      return res.status(400).json({ error: "OpenAI API Key 未提供。请在侧边栏设置或环境变量中配置。" });
    }

    const openai = new OpenAI({ 
      apiKey,
      baseURL: customBaseUrl || undefined
    });

    let basePrompt = prompt;
    if (chineseStyle) {
      basePrompt = `Strictly East Asian Chinese people in a mainland China setting. ${prompt}. Authentic Chinese urban/clinical environment. No Western features.`;
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Photorealistic high-quality image, 9:16 vertical framing. ${basePrompt}. Style: Professional photography, natural lighting, 8k resolution.`,
      n: 1,
      size: "1024x1792",
      quality: "hd",
    });

    res.json({ url: response.data[0].url });
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

app.post("/api/face-swap", async (req, res) => {
  try {
    const { url, apiKey, payload } = req.body;
    if (!url || !apiKey) {
      return res.status(400).json({ error: "URL and API Key are required" });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error: any) {
    console.error("FaceSwap Server Error:", error);
    res.status(500).json({ error: error.message || "FaceSwap request failed" });
  }
});

app.post("/api/face-swap-multipart", upload.any(), async (req, res) => {
  try {
    const { targetUrl, apiKey } = req.body;
    if (!targetUrl || !apiKey) {
      return res.status(400).json({ error: "targetUrl and apiKey are required" });
    }

    const formData = new FormData();
    for (const key in req.body) {
      if (key !== 'targetUrl' && key !== 'apiKey') {
        formData.append(key, req.body[key]);
      }
    }

    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      files.forEach((file) => {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append(file.fieldname, blob, file.originalname);
      });
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: formData
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorBody;
      if (contentType && contentType.includes('application/json')) {
        errorBody = await response.json();
      } else {
        errorBody = { error: await response.text() };
      }
      return res.status(response.status).json(errorBody);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("FaceSwap Multipart Server Error:", error);
    res.status(500).json({ error: error.message || "FaceSwap multipart request failed" });
  }
});

app.post("/api/simulate", (req, res) => {
  res.json({ success: true, message: "Use frontend Gemini SDK" });
});

app.post("/api/proxy", async (req, res) => {
  try {
    const { url, method, headers, body } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const fetchOptions: any = {
      method: method || 'GET',
      headers: headers || {},
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    // Set matching content type for the response
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Forward the response as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.status(response.status).send(buffer);
  } catch (error: any) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: error.message || "Proxy request failed" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", vercel: true });
});

export default app;
