import { useState, useEffect } from "react";

// Subcomponente para sliders de configuración
function ConfigSlider({ label, value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

// Subcomponente para selectores de configuración
function ConfigSelect({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Subcomponente para la pestaña de System Prompt
function SystemPromptTab({ onPromptChange }) {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState("default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/system-prompts");
      const data = await response.json();
      setPrompts(data.prompts || []);
      setError(null);
    } catch (err) {
      setError("Error al cargar los system prompts");
      console.error("Error loading prompts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptChange = async (promptName) => {
    try {
      setSelectedPrompt(promptName);
      const response = await fetch("/api/system-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ promptName }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Prompt cambiado:", data.message);
        if (onPromptChange) {
          onPromptChange(promptName);
        }
      } else {
        setError("Error al cambiar el system prompt");
      }
    } catch (err) {
      setError("Error al cambiar el system prompt");
      console.error("Error changing prompt:", err);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-600">Cargando system prompts...</p>;
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600 mb-2">{error}</p>
        <button 
          onClick={loadPrompts}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ConfigSelect
        label="Seleccionar Prompt:"
        value={selectedPrompt}
        onChange={handlePromptChange}
        options={prompts.map((prompt) => ({
          value: prompt,
          label: prompt.charAt(0).toUpperCase() + prompt.slice(1)
        }))}
      />
      <p className="text-xs text-gray-500 mt-1">
        El cambio se aplicará en la próxima sesión
      </p>
    </div>
  );
}

// Subcomponente para la pestaña de configuración de audio
function AudioConfigTab() {
  const [audioConfig, setAudioConfig] = useState({
    prefix_padding_ms: 500,
    silence_duration: 800,
    threshold: 0.5,
    noise_reduction_type: "near_field",
    voice: "alloy"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadAudioConfig();
  }, []);

  const loadAudioConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/configuration");
      const data = await response.json();
      
      if (data.audio) {
        setAudioConfig({
          prefix_padding_ms: data.audio.prefix_padding_ms || 500,
          silence_duration: data.audio.silence_duration || 800,
          threshold: data.audio.threshold || 0.5,
          noise_reduction_type: data.audio.noise_reduction_type || "near_field",
          voice: data.audio.voice || "alloy"
        });
      }
      setError(null);
    } catch (err) {
      setError("Error al cargar la configuración de audio");
      console.error("Error loading audio config:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateAudioConfig = async (updates) => {
    const newConfig = { ...audioConfig, ...updates };
    setAudioConfig(newConfig);

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch("/api/configuration/audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess("Configuración de audio actualizada correctamente");
        console.log("Audio config updated:", data.message);
      } else {
        setError("Error al actualizar la configuración de audio");
      }
    } catch (err) {
      setError("Error al actualizar la configuración de audio");
      console.error("Error updating audio config:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-600">Cargando configuración de audio...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-2 bg-green-100 border border-green-200 rounded text-sm text-green-700">
          {success}
        </div>
      )}

      <ConfigSlider
        label="Prefijo de silencio (ms)"
        value={audioConfig.prefix_padding_ms}
        onChange={(value) => updateAudioConfig({ prefix_padding_ms: value })}
        min={0}
        max={2000}
        step={50}
        unit="ms"
      />

      <ConfigSlider
        label="Duración del silencio (ms)"
        value={audioConfig.silence_duration}
        onChange={(value) => updateAudioConfig({ silence_duration: value })}
        min={0}
        max={2000}
        step={50}
        unit="ms"
      />

      <ConfigSlider
        label="Umbral de detección"
        value={audioConfig.threshold}
        onChange={(value) => updateAudioConfig({ threshold: value })}
        min={0.0}
        max={1.0}
        step={0.05}
      />

      <ConfigSelect
        label="Tipo de reducción de ruido"
        value={audioConfig.noise_reduction_type}
        onChange={(value) => updateAudioConfig({ noise_reduction_type: value })}
        options={[
          { value: "near_field", label: "Campo cercano" },
          { value: "far_field", label: "Campo lejano" }
        ]}
      />

      <ConfigSelect
        label="Voz"
        value={audioConfig.voice}
        onChange={(value) => updateAudioConfig({ voice: value })}
        options={[
          { value: "alloy", label: "Alloy" },
          { value: "echo", label: "Echo" },
          { value: "fable", label: "Fable" },
          { value: "onyx", label: "Onyx" },
          { value: "nova", label: "Nova" },
          { value: "shimmer", label: "Shimmer" },
          { value: "marin", label: "Marin" }
        ]}
      />

      {saving && (
        <p className="text-sm text-blue-600">Guardando configuración...</p>
      )}
    </div>
  );
}

// Subcomponente para la pestaña de selección de modelo
function ModelSelectorTab({ selectedModel, onModelChange, MODELS }) {
  return (
    <div className="space-y-2">
      <ConfigSelect
        label="Modelo de IA:"
        value={selectedModel}
        onChange={onModelChange}
        options={Object.entries(MODELS).map(([key, model]) => ({
          value: key,
          label: model.name
        }))}
      />
      <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
        <p className="font-medium mb-1">Precios por millón de tokens:</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="font-medium text-gray-700">Audio</p>
            <p>In: ${MODELS[selectedModel].pricing.audio.input}</p>
            <p>Cached: ${MODELS[selectedModel].pricing.audio.cachedInput}</p>
            <p>Out: ${MODELS[selectedModel].pricing.audio.output}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Texto</p>
            <p>In: ${MODELS[selectedModel].pricing.text.input}</p>
            <p>Cached: ${MODELS[selectedModel].pricing.text.cachedInput}</p>
            <p>Out: ${MODELS[selectedModel].pricing.text.output}</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        El cambio se aplicará en la próxima sesión
      </p>
    </div>
  );
}

// Componente principal con pestañas
export default function ConfigurationSelector({ onPromptChange, selectedModel, onModelChange, MODELS }) {
  const [activeTab, setActiveTab] = useState("model");

  return (
    <div className="bg-white rounded-md p-4 border border-gray-200">
      <h3 className="text-lg font-bold mb-4">Configuración</h3>
      
      {/* Pestañas */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "model"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("model")}
        >
          Modelo
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "system-prompt"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("system-prompt")}
        >
          System Prompt
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "audio"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("audio")}
        >
          Audio
        </button>
      </div>

      {/* Contenido de las pestañas */}
      <div>
        {activeTab === "model" && (
          <ModelSelectorTab
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            MODELS={MODELS}
          />
        )}
        {activeTab === "system-prompt" && (
          <SystemPromptTab onPromptChange={onPromptChange} />
        )}
        {activeTab === "audio" && <AudioConfigTab />}
      </div>
    </div>
  );
}