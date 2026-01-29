import { useState, useEffect } from "react";

export default function SystemPromptSelector({ onPromptChange }) {
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
    return (
      <div className="bg-white rounded-md p-4 border border-gray-200">
        <h3 className="text-lg font-bold mb-2">System Prompt</h3>
        <p className="text-sm text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-md p-4 border border-red-200">
        <h3 className="text-lg font-bold mb-2 text-red-600">System Prompt</h3>
        <p className="text-sm text-red-600">{error}</p>
        <button 
          onClick={loadPrompts}
          className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md p-4 border border-gray-200">
      <h3 className="text-lg font-bold mb-2">System Prompt</h3>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Seleccionar Prompt:
        </label>
        <select
          value={selectedPrompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {prompts.map((prompt) => (
            <option key={prompt} value={prompt}>
              {prompt.charAt(0).toUpperCase() + prompt.slice(1)}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          El cambio se aplicará en la próxima sesión
        </p>
      </div>
    </div>
  );
}