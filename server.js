import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { loadSystemPrompt, getAvailableSystemPrompts } from "./utils/systemPromptLoader.js";
import formAutomationService from "./services/formAutomationService.js";

const app = express();
app.use(express.text());
app.use(express.json());
app.use('/screenshots', express.static('screenshots'));
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;
let currentSystemPrompt = loadSystemPrompt('default');

// Audio configuration state
let audioConfig = {
  prefix_padding_ms: 500,
  silence_duration: 800,
  threshold: 0.5,
  noise_reduction_type: "near_field",
  voice: "alloy"
};

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

function getSessionConfig(model = "gpt-realtime") {
  return JSON.stringify({
    session: {
      type: "realtime",
      model: model,
      instructions: currentSystemPrompt,
      audio: {
        input: {
          format: {
            type: "audio/pcm",
            rate: 24000
          },
          noise_reduction: {
            type: "near_field"
          },
          transcription: {
            model: "gpt-4o-transcribe",
            prompt: "",
            language: "es"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.9,
            prefix_padding_ms: 300,
            silence_duration_ms: 900
          }
        },
        output: {
          voice: "marin"
        }
      },
      include: [
        "item.input_audio_transcription.logprobs"
      ]
    }
  });
}

// All-in-one SDP request (experimental)
app.post("/session", async (req, res) => {
  const fd = new FormData();
  console.log(req.body);
  fd.set("sdp", req.body);
  fd.set("session", getSessionConfig());

  const r = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      "OpenAI-Beta": "realtime=v1",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: fd,
  });
  const sdp = await r.text();
  console.log(sdp);

  // Send back the SDP we received from the OpenAI REST API
  res.send(sdp);
});

// API route for ephemeral token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: getSessionConfig(),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// API route to get available system prompts
app.get("/api/system-prompts", (req, res) => {
  try {
    const prompts = getAvailableSystemPrompts();
    res.json({ prompts, current: currentSystemPrompt });
  } catch (error) {
    console.error("Error getting system prompts:", error);
    res.status(500).json({ error: "Failed to get system prompts" });
  }
});

// API route to change system prompt
app.post("/api/system-prompt", express.json(), (req, res) => {
  try {
    const { promptName } = req.body;
    
    if (!promptName) {
      return res.status(400).json({ error: "promptName is required" });
    }
    
    const newPrompt = loadSystemPrompt(promptName);
    currentSystemPrompt = newPrompt;
    
    res.json({
      message: `System prompt changed to: ${promptName}`,
      prompt: currentSystemPrompt
    });
  } catch (error) {
    console.error("Error changing system prompt:", error);
    res.status(500).json({ error: "Failed to change system prompt" });
  }
});

// API route to get current configuration
app.get("/api/configuration", (req, res) => {
  try {
    res.json({ audio: audioConfig });
  } catch (error) {
    console.error("Error getting configuration:", error);
    res.status(500).json({ error: "Failed to get configuration" });
  }
});

// API route to update audio configuration
app.post("/api/configuration/audio", (req, res) => {
  try {
    const newConfig = req.body;
    
    // Update audio configuration with received values
    audioConfig = {
      prefix_padding_ms: newConfig.prefix_padding_ms || audioConfig.prefix_padding_ms,
      silence_duration: newConfig.silence_duration || audioConfig.silence_duration,
      threshold: newConfig.threshold || audioConfig.threshold,
      noise_reduction_type: newConfig.noise_reduction_type || audioConfig.noise_reduction_type,
      voice: newConfig.voice || audioConfig.voice
    };
    
    res.json({
      message: "Audio configuration updated successfully",
      config: audioConfig
    });
  } catch (error) {
    console.error("Error updating audio configuration:", error);
    res.status(500).json({ error: "Failed to update audio configuration" });
  }
});

// API route for form automation
app.post("/api/automate-form", express.json(), async (req, res) => {
  try {
    const { firstName, lastName, email, subject, inquiry } = req.body;
    
    if (!firstName || !lastName || !email || !subject || !inquiry) {
      return res.status(400).json({
        error: "Todos los campos son requeridos: firstName, lastName, email, subject, inquiry"
      });
    }
    
    const formData = {
      firstName,
      lastName,
      email,
      subject,
      inquiry
    };
    
    const result = await formAutomationService.fillAndSubmitForm(formData);
    
    if (result.success) {
      res.json({
        message: result.message,
        referenceNumber: result.referenceNumber,
        screenshots: result.screenshots
      });
    } else {
      res.status(500).json({
        error: result.error,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Error en automatización de formulario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
