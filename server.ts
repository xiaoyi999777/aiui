import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import multer from "multer";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  
  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, chineseStyle, customApiKey, customBaseUrl, model } = req.body;
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
        model: model || "dall-e-3",
        prompt: `Photorealistic high-quality image, 9:16 vertical framing. ${basePrompt}. Style: Professional photography, natural lighting, 8k resolution.`,
        n: 1,
        size: "1024x1792",
        quality: "hd",
        response_format: "url"
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

      console.log(`[FaceSwap] Requesting: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || "Empty response from upstream", status: response.status };
      }

      if (!response.ok) {
        console.error(`[FaceSwap] Upstream Error (${response.status}):`, data);
        return res.status(response.status).json(data);
      }
      res.json(data);
    } catch (error: any) {
      console.error("FaceSwap Server Error:", error);
      res.status(500).json({ 
        error: error.message || "FaceSwap request failed",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      });
    }
  });

  app.post("/api/face-swap-multipart", upload.any(), async (req, res) => {
    try {
      const { targetUrl, apiKey } = req.body;
      if (!targetUrl || !apiKey) {
        return res.status(400).json({ error: "targetUrl and apiKey are required" });
      }

      const formData = new FormData();
      
      // Append non-file fields
      for (const key in req.body) {
        if (key !== 'targetUrl' && key !== 'apiKey') {
          formData.append(key, req.body[key]);
        }
      }

      // Append files
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        files.forEach((file) => {
          const blob = new Blob([file.buffer], { type: file.mimetype });
          formData.append(file.fieldname, blob, file.originalname);
        });
      }

      console.log(`[FaceSwap Multipart] Forwarding to: ${targetUrl}`);
      
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
        console.error(`[FaceSwap Multipart] Upstream Error (${response.status}):`, errorBody);
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
        method: (method || 'GET').toUpperCase(),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          ...(headers || {})
        },
        redirect: 'follow'
      };
      
      if (body && (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT')) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        fetchOptions.body = bodyStr;
        console.log(`[Proxy] Body set, method: ${fetchOptions.method}, length: ${bodyStr.length} characters`);
      }

      console.log(`[Proxy] Forwarding ${fetchOptions.method} to ${url}`);
      const response = await fetch(url, fetchOptions);
      
      if (response.redirected) {
        console.log(`[Proxy] Redirected to: ${response.url}`);
      }

      if (!response.ok) {
        console.error(`Upstream Error [${url}]: ${response.status} ${response.statusText}`);
        console.log(`Request Method: ${fetchOptions.method}`);
        console.log(`Request Headers:`, JSON.stringify(fetchOptions.headers, null, 2));
        
        // Try to get more info from body
        try {
          const bodyPeek = await response.clone().text();
          console.log(`Upstream Response Body Peek: ${bodyPeek.slice(0, 200)}`);
        } catch (e) {
          console.log(`Could not peek body.`);
        }
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.status(response.status).send(buffer);
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: error.message || "Proxy request failed" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [${isProd ? 'PROD' : 'DEV'}]`);
  });
}

startServer();
