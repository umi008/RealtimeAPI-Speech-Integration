import { useState, useEffect, useRef } from "react";

export default function ChatTranscription({ events }) {
  const [transcriptions, setTranscriptions] = useState([]);
  const currentAudioTranscript = useRef("");
  const currentTextTranscript = useRef("");
  const currentResponseId = useRef(null);

  useEffect(() => {
    // Extraer transcripciones de los eventos
    const newTranscriptions = [];
    
    events.forEach(event => {
      // Eventos de transcripción completada del usuario
      if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
        newTranscriptions.push({
          id: event.item_id,
          type: "user",
          text: event.transcript,
          timestamp: event.timestamp,
          isPartial: false
        });
      }
      
      // Eventos de mensaje creado del usuario (para texto escrito)
      if (event.type === "conversation.item.created" &&
          event.item &&
          event.item.type === "message" &&
          event.item.role === "user") {
        // Extraer el texto del mensaje del usuario
        const text = event.item.content
          .filter(content => content.type === "input_text" || content.type === "input_audio")
          .map(content => content.text || "[Audio]")
          .join(" ");
          
        if (text) {
          newTranscriptions.push({
            id: event.event_id || crypto.randomUUID(),
            type: "user",
            text: text,
            timestamp: event.timestamp,
            isPartial: false
          });
        }
      }
      
      // Eventos de respuesta del asistente - iniciar nueva respuesta (limpiar acumuladores)
      if (event.type === "response.created" &&
          event.response &&
          event.response.output) {
        // Limpiar acumuladores para nueva respuesta
        currentAudioTranscript.current = "";
        currentTextTranscript.current = "";
        currentResponseId.current = event.response.id || crypto.randomUUID();
      }
      
      // Eventos de transcripción del asistente (texto) - solo acumular
      if (event.type === "response.text.delta" && event.delta) {
        currentTextTranscript.current += event.delta;
      }
      
      // Eventos de transcripción de audio del asistente - solo acumular
      if (event.type === "response.output_audio_transcript.delta" && event.delta) {
        currentAudioTranscript.current += event.delta;
      }
      
      // Eventos completos de respuesta del asistente
      if (event.type === "response.done") {
        
        const responseId = event.response?.id || currentResponseId.current || crypto.randomUUID();
        let finalText = "";
        let contentType = "text";
        
        // Si tenemos transcripción de audio acumulada, usarla
        if (currentAudioTranscript.current.trim()) {
          finalText = currentAudioTranscript.current;
          contentType = "audio_transcript";
        }
        // Si tenemos texto acumulado, usarlo
        else if (currentTextTranscript.current.trim()) {
          finalText = currentTextTranscript.current;
          contentType = "text";
        }
        // Si no, intentar extraer de la respuesta
        else if (event.response && event.response.output && Array.isArray(event.response.output)) {
          // Buscar en items de tipo message
          event.response.output.forEach(item => {
            if (item.type === "message" && item.role === "assistant" && item.content) {
              item.content.forEach(content => {
                // Si es output_audio, usar el transcript
                if (content.type === "output_audio" && content.transcript) {
                  finalText = content.transcript;
                  contentType = "audio_transcript";
                }
                // Si es text, usar el text
                else if (content.type === "text" && content.text) {
                  finalText = content.text;
                  contentType = "text";
                }
              });
            }
          });
        }
        
        // Si tenemos texto, mostrarlo
        if (finalText.trim()) {
          // Extraer información de uso de tokens
          const usage = event.response?.usage || null;
          
          newTranscriptions.push({
            id: responseId,
            type: "assistant",
            text: finalText.trim(),
            timestamp: event.timestamp,
            isPartial: false,
            contentType: contentType,
            usage: usage
          });
        }
        
        // Limpiar acumuladores
        currentAudioTranscript.current = "";
        currentTextTranscript.current = "";
        currentResponseId.current = null;
      }
    });
    
    // Mantener el historial existente y agregar solo las nuevas transcripciones
    setTranscriptions(prev => {
      // Combinar transcripciones anteriores con nuevas, eliminando duplicados por ID
      const combined = [...prev];
      newTranscriptions.forEach(newTrans => {
        const existingIndex = combined.findIndex(t => t.id === newTrans.id);
        if (existingIndex >= 0) {
          // Reemplazar si ya existe
          combined[existingIndex] = newTrans;
        } else {
          // Agregar si es nuevo
          combined.push(newTrans);
        }
      });
      return combined;
    });
  }, [events]);
  // Componente para mostrar desglose de tokens
  const TokenBreakdown = ({ usage }) => {
    if (!usage) return null;
    
    const { input_tokens, output_tokens, cached_tokens, input_token_details, output_token_details } = usage;
    const totalTokens = (input_tokens || 0) + (output_tokens || 0) + (cached_tokens || 0);
    
    if (totalTokens === 0) return null;
    
    return (
      <div className="mt-2 pt-2 border-t border-gray-300/50">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600">Tokens: {totalTokens}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-1 text-xs">
          {input_tokens > 0 && (
            <span className="text-blue-600">
              In: {input_tokens}
            </span>
          )}
          {cached_tokens > 0 && (
            <span className="text-gray-600">
              Cache: {cached_tokens}
            </span>
          )}
          {output_tokens > 0 && (
            <span className="text-purple-600">
              Out: {output_tokens}
            </span>
          )}
        </div>
        {input_token_details && (
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            {input_token_details.audio_tokens > 0 && (
              <span className="text-indigo-600">
                🎤 Audio: {input_token_details.audio_tokens}
              </span>
            )}
            {input_token_details.text_tokens > 0 && (
              <span className="text-blue-500">
                📝 Texto: {input_token_details.text_tokens}
              </span>
            )}
          </div>
        )}
        {output_token_details && (
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            {output_token_details.audio_tokens > 0 && (
              <span className="text-pink-600">
                🔊 Audio: {output_token_details.audio_tokens}
              </span>
            )}
            {output_token_details.text_tokens > 0 && (
              <span className="text-purple-500">
                📝 Texto: {output_token_details.text_tokens}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {transcriptions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No hay transcripciones aún</p>
            <p className="text-sm mt-2">Las conversaciones aparecerán aquí cuando comiences una sesión</p>
          </div>
        ) : (
          transcriptions.map((transcription) => (
            <div
              key={transcription.id}
              className={`flex ${transcription.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  transcription.type === "user"
                    ? "bg-blue-500 text-white"
                    : transcription.contentType === "audio"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : transcription.contentType === "audio_transcript"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <p className="text-sm flex-1">{transcription.text}</p>
                  {transcription.contentType === "audio" && (
                    <span className="text-purple-600 text-xs">🔊</span>
                  )}
                  {transcription.contentType === "audio_transcript" && (
                    <span className="text-green-600 text-xs">🎤</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${
                    transcription.type === "user"
                      ? "text-blue-100"
                      : transcription.contentType === "audio"
                      ? "text-purple-600"
                      : transcription.contentType === "audio_transcript"
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}>
                    {transcription.timestamp}
                  </p>
                  {transcription.contentType && (
                    <span className={`text-xs ${
                      transcription.contentType === "audio"
                        ? "text-purple-600"
                        : transcription.contentType === "audio_transcript"
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}>
                      {transcription.contentType === "audio"
                        ? "Audio"
                        : transcription.contentType === "audio_transcript"
                        ? "Transcripción"
                        : "Texto"}
                    </span>
                  )}
                </div>
                {transcription.type === "assistant" && transcription.usage && (
                  <TokenBreakdown usage={transcription.usage} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}