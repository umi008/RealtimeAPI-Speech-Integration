# OpenAI Realtime Console - API de Voz en Tiempo Real

## Descripción del Proyecto

Aplicación de demostración que implementa la [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) con soporte para [WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc). Esta consola permite interacciones de voz en tiempo real con asistentes de IA configurables, integrando capacidades de automatización de formularios y múltiples roles especializados.

El sistema utiliza una arquitectura basada en Express para servir el frontend React, con Vite como herramienta de build. Facilita el envío y recepción de eventos de la Realtime API a través del canal de datos WebRTC y permite configurar function calling desde el cliente.

## Roles Disponibles (System Prompts)

La aplicación incluye múltiples roles preconfigurados en [`system_prompts/`](./system_prompts/) para diferentes casos de uso:

- 🔧 **Default** - Asistente general de voz, amigable y profesional para tareas diversas
- 🎨 **Creative Designer** - Asistente especializado en diseño creativo y visual
- 📊 **Event Planner** - Planificador de eventos y coordinación logística
- 🛋️ **Furniture Salesman** - Asistente de ventas especializado en muebles
- 👥 **HR Recruiter** - Reclutador de recursos humanos y gestión de talento
- 🏠 **Jarvis House Automation** - Asistente de automatización doméstica estilo Jarvis
- 📐 **Math Tutor** - Tutor matemático para enseñanza y resolución de problemas
- 🏥 **Medical Receptionist** - Recepcionista médico para gestión de citas y consultas
- 🍽️ **Restaurant Assistant** - Asistente para restaurantes, pedidos y reservaciones
- 💻 **Tech Support** - Soporte técnico especializado en resolución de problemas de tecnología

## Configuración de Interfaz

La interfaz de usuario proporciona controles intuitivos a través de tres componentes principales:

### Controles de Sesión ([`SessionControls.jsx`](client/components/SessionControls.jsx))

- **Iniciar/Detener Sesión**: Botón principal para establecer o cerrar la conexión WebSocket con OpenAI
- **Envío de Mensajes de Texto**: Input con soporte para envío mediante tecla Enter o botón dedicado
- **Estado Visual**: Indicadores claros de estado (iniciando sesión, sesión activa, desconectado)

### Selector de Configuración ([`ConfigurationSelector.jsx`](client/components/ConfigurationSelector.jsx))

Panel de configuración organizado en tres pestañas:

#### 🤖 Modelo
- Selección del modelo de IA (gpt-4o-realtime-preview, gpt-4o-mini-realtime-preview)
- Visualización de precios por millón de tokens para audio y texto
- Información de costos: Input, Cached Input y Output

#### 📝 System Prompt
- Lista dinámica de roles disponibles cargados desde [`system_prompts/`](./system_prompts/)
- Cambio dinámico de personalidad del asistente
- Notificación de aplicación en la próxima sesión

#### 🔊 Audio
- **Prefijo de silencio**: Slider ajustable (0-2000ms, paso 50ms) para configurar el padding de audio inicial
- **Duración del silencio**: Slider (0-2000ms, paso 50ms) para ajustar el tiempo de detección de silencio
- **Umbral de detección**: Slider (0.0-1.0, paso 0.05) para sensibilidad del VAD (Voice Activity Detection)
- **Tipo de reducción de ruido**: Selector entre `near_field` (campo cercano) y `far_field` (campo lejano)
- **Voz**: Selección de voz sintética (Alloy, Echo, Fable, Onyx, Nova, Shimmer, Marin)

### Panel de Eventos ([`EventLog.jsx`](client/components/EventLog.jsx))

Visualización en tiempo real de payloads JSON para eventos de cliente y servidor, útil para debugging y análisis de la comunicación con la API.

## Instalación y Uso

Requiere una API key de OpenAI - [crea una aquí](https://platform.openai.com/settings/api-keys). Crea un archivo `.env` desde el ejemplo:

```bash
cp .env.example .env
```

Configura tu API key en el archivo `.env`:

```
OPENAI_API_KEY=tu_api_key_aqui
```

Requiere [Node.js](https://nodejs.org/) instalado. Instala las dependencias:

```bash
npm install
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Arquitectura del Sistema

| Componente | Responsabilidad |
|------------|-----------------|
| **Servidor Backend** ([`server.js`](server.js)) | Orquesta conexiones WebSocket, provee tokens de autenticación, expone endpoints de configuración |
| **Cliente React** ([`client/`](client/)) | Interfaz de usuario, gestión de estado de sesión, visualización de transcripciones |
| **Servicio de Automatización** ([`services/formAutomationService.js`](services/formAutomationService.js)) | Automatización de formularios web mediante Puppeteer |
| **Cargador de Prompts** ([`utils/systemPromptLoader.js`](utils/systemPromptLoader.js)) | Carga dinámica de roles desde [`system_prompts/`](./system_prompts/) |

## Licencia

MIT
