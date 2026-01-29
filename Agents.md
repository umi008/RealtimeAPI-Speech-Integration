# Agentes del Sistema Audio Realtime API

| Agente / Actor | Rol | Responsabilidades | Interacciones |
|----------------|-----|-------------------|---------------|
| **Usuario Humano** | Cliente final del sistema | - Iniciar y detener sesiones de voz<br>- Enviar mensajes de texto y voz<br>- Seleccionar configuraciones y prompts<br>- Visualizar transcripciones y eventos<br>- Interactuar con herramientas de automatización | Usuario ↔ Interfaz React<br>Usuario ↔ Asistente de Voz |
| **Asistente de Voz (IA)** | Agente conversacional inteligente | - Procesar audio de entrada y salida<br>- Responder según el rol configurado (default u Operador Telefónico)<br>- Ejecutar herramientas (paletas de colores, automatización de formularios)<br>- Mantener contexto conversacional<br>- Adaptar tono y personalidad según el prompt activo | Asistente de Voz ↔ Usuario<br>Asistente de Voz ↔ Servicio de Automatización<br>Asistente de Voz ↔ OpenAI Realtime API |
| **Servidor Backend** | Orquestador de comunicaciones | - Gestionar conexiones WebSocket con OpenAI<br>- Proveer tokens de autenticación<br>- Manejar configuración de audio<br>- Exponer endpoints para automatización<br>- Servir la aplicación React cliente | Servidor Backend ↔ OpenAI API<br>Servidor Backend ↔ Cliente React<br>Servidor Backend ↔ Servicio de Automatización |
| **Servicio de Automatización** | Automatizador de formularios web | - Llenar formularios web automáticamente<br>- Capturar screenshots como evidencia<br>- Extraer números de referencia<br>- Manejar errores en el proceso<br>- Interactuar con sitios externos mediante Puppeteer | Servicio de Automatización ↔ Formularios Web<br>Servicio de Automatización ↔ Asistente de Voz<br>Servicio de Automatización ↔ Servidor Backend |
| **OpenAI Realtime API** | Motor de procesamiento de IA | - Procesamiento de voz en tiempo real<br>- Transcripción de audio<br>- Generación de respuestas conversacionales<br>- Ejecución de funciones/tools<br>- Detección de turnos de habla | OpenAI Realtime API ↔ Servidor Backend<br>OpenAI Realtime API ↔ Asistente de Voz |
| **Sistema de Gestión de Prompts** | Configurador de roles de IA | - Cargar diferentes roles de IA (default, Operador Telefónico)<br>- Permitir cambio dinámico de personalidad<br>- Mantener configuraciones de sistema<br>- Proveer instrucciones específicas según el rol | Sistema de Prompts ↔ Asistente de Voz<br>Sistema de Prompts ↔ Servidor Backend |
| **Interfaz React Cliente** | Puente de interacción usuario-sistema | - Renderizar componentes de control<br>- Mostrar transcripciones en tiempo real<br>- Gestionar estado de sesión<br>- Proporcionar controles de configuración<br>- Visualizar resultados de automatización | Interfaz React ↔ Usuario<br>Interfaz React ↔ Servidor Backend |

## Roles Específicos del Asistente de Voz

### Rol Default
- **Nombre**: Agente de Voz Asistente
- **Personalidad**: Amigable, conciso pero completo, profesional pero cercano
- **Idioma**: Español de México
- **Función**: Asistente general para tareas diversas


## Flujo de Interacción Principal

1. El **Usuario** inicia sesión mediante la **Interfaz React**
2. El **Servidor Backend** obtiene token de **OpenAI Realtime API**
3. Se establece conexión WebSocket entre cliente y OpenAI
4. El **Sistema de Gestión de Prompts** configura el rol del **Asistente de Voz**
5. El **Usuario** interactúa por voz/texto con el **Asistente de Voz**
6. Si se requiere automatización, el **Asistente de Voz** invoca al **Servicio de Automatización**
7. El **Servicio de Automatización** interactúa con **Formularios Web** externos
8. Los resultados se muestran al **Usuario** través de la **Interfaz React**