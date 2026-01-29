import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";
import ConfigurationSelector from "./ConfigurationSelector";
import ChatTranscription from "./ChatTranscription";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [activeLeftTab, setActiveLeftTab] = useState("updates");
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  
  // Modelos disponibles con sus precios por millón de tokens
  const MODELS = {
    standard: {
      id: "gpt-realtime",
      name: "Standard",
      pricing: {
        audio: { input: 32.00, cachedInput: 0.40, output: 64.00 },
        text: { input: 4.00, cachedInput: 0.40, output: 16.00 }
      }
    },
    mini: {
      id: "gpt-realtime-mini",
      name: "Mini",
      pricing: {
        audio: { input: 10.00, cachedInput: 0.30, output: 20.00 },
        text: { input: 0.60, cachedInput: 0.06, output: 2.40 }
      }
    }
  };

  const [selectedModel, setSelectedModel] = useState("standard");

  // Función para calcular tokens y costo usando desglose detallado
  const calculateTokensAndCost = (event) => {
    let tokens = 0;
    let cost = 0;
    const pricing = MODELS[selectedModel].pricing;
    
    if (event.type === 'response.done' && event.response && event.response.usage) {
      const usage = event.response.usage;
      
      // Extraer desglose de tokens de entrada
      const inputDetails = usage.input_token_details || {};
      const audioInputTokens = inputDetails.audio_tokens || 0;
      const textInputTokens = inputDetails.text_tokens || 0;
      const cachedInputTokens = inputDetails.cached_tokens || 0;
      
      // Extraer desglose de tokens de salida
      const outputDetails = usage.output_token_details || {};
      const audioOutputTokens = outputDetails.audio_tokens || 0;
      const textOutputTokens = outputDetails.text_tokens || 0;
      
      // Sumar todos los tokens
      tokens = audioInputTokens + textInputTokens + cachedInputTokens +
               audioOutputTokens + textOutputTokens;
      
      // Calcular costo componente por componente (todo dividido por 1M)
      const audioInputCost = (audioInputTokens / 1000000) * pricing.audio.input;
      const audioOutputCost = (audioOutputTokens / 1000000) * pricing.audio.output;
      const textInputCost = (textInputTokens / 1000000) * pricing.text.input;
      const textOutputCost = (textOutputTokens / 1000000) * pricing.text.output;
      const cachedCost = (cachedInputTokens / 1000000) * pricing.audio.cachedInput;
      
      cost = audioInputCost + audioOutputCost + textInputCost + textOutputCost + cachedCost;
    }
    
    return { tokens, cost };
  };

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch(`/token?model=${MODELS[selectedModel].id}`);
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime/calls";
    const model = MODELS[selectedModel].id;
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const sdp = await sdpResponse.text();
    const answer = { type: "answer", sdp };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        // Calcular tokens y costo solo para eventos response.done (contiene usage)
        if (event.type === 'response.done') {
          const { tokens, cost } = calculateTokensAndCost(event);
          if (tokens > 0 || cost > 0) {
            setTotalTokens(prev => prev + tokens);
            setTotalCost(prev => prev + cost);
          }
        }

        setEvents((prev) => [event, ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setSessionStartTime(Date.now());
        setCurrentTime(Date.now());
        setEvents([]);
        setTotalTokens(0);
        setTotalCost(0);
      });
    }
  }, [dataChannel]);

  // Actualizar currentTime cada segundo durante sesión activa
  useEffect(() => {
    let interval;
    if (isSessionActive) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive]);

  // Formatear los valores para mostrar
  const formatCost = (cost) => {
    return `$${cost.toFixed(4)}`;
  };
  
  const formatTokens = (tokens) => {
    return `${Math.round(tokens)}T`;
  };

  const formatTime = (ms) => {
    if (!ms || ms < 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getCostPerMinute = () => {
    if (!sessionStartTime || !isSessionActive) return null;
    const elapsedMinutes = (currentTime - sessionStartTime) / 60000;
    if (elapsedMinutes <= 0) return null;
    return totalCost / elapsedMinutes;
  };

  const getSessionDuration = () => {
    if (!sessionStartTime || !isSessionActive) return 0;
    return currentTime - sessionStartTime;
  };

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px", filter: "invert(21%) sepia(98%) saturate(7475%) hue-rotate(247deg) brightness(97%) contrast(101%)" }} src={logo} />
          <h1>Agente de Voz</h1>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex flex-col">
          {/* Tabs en la parte izquierda */}
          <div className="flex border-b border-gray-200 bg-white relative">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeLeftTab === "updates"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveLeftTab("updates")}
            >
              Actualizaciones
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeLeftTab === "chat"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveLeftTab("chat")}
            >
              Chat
            </button>
            
            {/* Contadores en la parte superior derecha */}
            <div className="absolute right-0 top-0 flex items-center h-full pr-4 space-x-4">
              <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {formatTime(getSessionDuration())}
              </div>
              <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {formatCost(totalCost)}
              </div>
              <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {formatTokens(totalTokens)}
              </div>
              {getCostPerMinute() !== null && (
                <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  ${getCostPerMinute().toFixed(4)}/min
                </div>
              )}
            </div>
          </div>
          
          {/* Contenido de las tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeLeftTab === "updates" && (
              <>
                <section className="flex-1 px-4 overflow-y-auto pb-2">
                  <EventLog events={events} />
                </section>
                <section className="flex-shrink-0 h-32 p-4 border-t border-gray-200 bg-white">
                  <SessionControls
                    startSession={startSession}
                    stopSession={stopSession}
                    sendClientEvent={sendClientEvent}
                    sendTextMessage={sendTextMessage}
                    events={events}
                    isSessionActive={isSessionActive}
                  />
                </section>
              </>
            )}
            {activeLeftTab === "chat" && (
              <section className="flex-1 px-4 py-4 overflow-hidden">
                <div className="bg-white rounded-md border border-gray-200 h-full overflow-hidden">
                  <ChatTranscription events={events} />
                </div>
              </section>
            )}
          </div>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto space-y-4">
          <ConfigurationSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            MODELS={MODELS}
          />
          <ToolPanel
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
          />
        </section>
      </main>
    </>
  );
}
