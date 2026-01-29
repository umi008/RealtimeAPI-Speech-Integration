import { useEffect, useState } from "react";

const colorPaletteDescription = `
Call this function when a user asks for a color palette.
`;

const formAutomationDescription = `
CUANDO EL USUARIO QUIERA LLENAR UN FORMULARIO O MENCIONE DATOS COMO NOMBRE, EMAIL, ETC.,
USA ESTA FUNCIÓN AUTOMÁTICAMENTE. NO LE PIDAS AL USUARIO QUE LO HAGA MANUALMENTE.

Esta función automatiza completamente el proceso:
1. Accede a https://formsmarts.com/html-form-example
2. Llena todos los campos del formulario con los datos proporcionados
3. Hace click en "Continuar"
4. Hace click en "Confirmar"
5. Toma screenshots como evidencia
6. Extrae el número de referencia

PARÁMETROS REQUERIDOS:
- firstName: Nombre del usuario
- lastName: Apellido del usuario
- email: Correo electrónico
- subject: "Sales Inquiry" o "Support Inquiry" o "Website Feedback"
- inquiry: Mensaje o consulta detallada

USA ESTA FUNCIÓN SIEMPRE QUE EL USUARIO MENCIONE DATOS PERSONALES O QUIERA COMPLETAR UN FORMULARIO.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    type: "realtime",
    tools: [
      {
        type: "function",
        name: "display_color_palette",
        description: colorPaletteDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            theme: {
              type: "string",
              description: "Description of the theme for the color scheme.",
            },
            colors: {
              type: "array",
              description: "Array of five hex color codes based on the theme.",
              items: {
                type: "string",
                description: "Hex color code",
              },
            },
          },
          required: ["theme", "colors"],
        },
      },
      {
        type: "function",
        name: "automate_form_submission",
        description: formAutomationDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            firstName: {
              type: "string",
              description: "Nombre del formulario (First Name)",
            },
            lastName: {
              type: "string",
              description: "Apellido del formulario (Last Name)",
            },
            email: {
              type: "string",
              description: "Correo electrónico del formulario (Email)",
            },
            subject: {
              type: "string",
              enum: ["Sales Inquiry", "Support Inquiry", "Website Feedback"],
              description: "Tipo de consulta (Subject of Your Inquiry)",
            },
            inquiry: {
              type: "string",
              description: "Mensaje o consulta detallada (Inquiry)",
            },
          },
          required: ["firstName", "lastName", "email", "subject", "inquiry"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { theme, colors } = JSON.parse(functionCallOutput.arguments);

  const colorBoxes = colors.map((color) => (
    <div
      key={color}
      className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
        {color}
      </p>
    </div>
  ));

  return (
    <div className="flex flex-col gap-2">
      <p>Tema: {theme}</p>
      {colorBoxes}
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [colorPaletteOutput, setColorPaletteOutput] = useState(null);
  const [formAutomationOutput, setFormAutomationOutput] = useState(null);
  const [formProcessingResult, setFormProcessingResult] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "display_color_palette"
        ) {
          setColorPaletteOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                ask for feedback about the color palette - don't repeat
                the colors, just ask if they like the colors.
              `,
              },
            });
          }, 500);
        }
        
        if (
          output.type === "function_call" &&
          output.name === "automate_form_submission"
        ) {
          setFormAutomationOutput(output);
          setFormProcessingResult(null);
          executeFormAutomation(JSON.parse(output.arguments));
        }
      });
    }
  }, [events]);

  const executeFormAutomation = async (formData) => {
    try {
      setFormProcessingResult({ processing: true, message: "Iniciando automatización..." });
      
      const response = await fetch('/api/automate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (response.ok) {
        setFormProcessingResult({ success: true, ...result });
        
        setTimeout(() => {
          sendClientEvent({
            type: "response.create",
            response: {
              instructions: `
                ¡FORMULARIO PROCESADO EXITOSAMENTE!
                Informale al usuario que el formulario ha sido completado automáticamente.
                Número de referencia: ${result.referenceNumber || 'No disponible'}.
                Se han capturado screenshots como evidencia del proceso.
                El proceso fue completamente automatizado, el usuario no tuvo que hacer nada manualmente.
              `,
            },
          });
        }, 500);
      } else {
        setFormProcessingResult({
          success: false,
          error: result.error,
          message: result.message || "Error al procesar el formulario"
        });
        
        setTimeout(() => {
          sendClientEvent({
            type: "response.create",
            response: {
              instructions: `
                ERROR EN LA AUTOMATIZACIÓN DEL FORMULARIO.
                Informa al usuario que no se pudo procesar el formulario automáticamente.
                Error específico: ${result.error || result.message || 'Error desconocido'}.
                Sugiere verificar los datos e intentar nuevamente en unos minutos.
              `,
            },
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error en executeFormAutomation:', error);
      setFormProcessingResult({
        success: false,
        error: error.message,
        message: "Error de conexión al procesar el formulario"
      });
      
      setTimeout(() => {
        sendClientEvent({
          type: "response.create",
          response: {
            instructions: `
              ERROR DE CONEXIÓN EN LA AUTOMATIZACIÓN.
              Informa al usuario que no se pudo conectar con el servicio de automatización.
              Error: ${error.message}.
              Sugiere intentar nuevamente en unos momentos.
            `,
          },
        });
      }, 500);
    }
  };

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setColorPaletteOutput(null);
      setFormAutomationOutput(null);
      setFormProcessingResult(null);
    }
  }, [isSessionActive]);

  // Componente para mostrar salida del formulario
  function FormAutomationDisplay({ output, result }) {
    if (!output) return null;
    
    const { firstName, lastName, email, subject, inquiry } = JSON.parse(output.arguments);

    if (result && result.processing) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h3 className="text-gray-800 font-bold mb-2">⏳ Procesando...</h3>
          <p className="text-gray-700 text-sm">{result.message}</p>
        </div>
      );
    } else if (result && result.success) {
      return (
        <div className="flex flex-col gap-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="text-green-800 font-bold mb-2">✅ Formulario Procesado Exitosamente</h3>
            <p className="text-green-700 text-sm">{result.message}</p>
            {result.referenceNumber && (
              <div className="mt-3 bg-white border border-green-300 rounded-md p-3">
                <p className="text-green-800 text-sm font-semibold">Número de Referencia:</p>
                <p className="text-green-900 text-xl font-bold">{result.referenceNumber}</p>
              </div>
            )}
          </div>
          
          {result.screenshots && (
            <div className="space-y-2">
              <h4 className="font-bold text-sm">Evidencias Capturadas:</h4>
              
              {result.screenshots.intermediate && (
                <div className="border border-gray-200 rounded-md p-2">
                  <img
                    src={result.screenshots.intermediate}
                    alt="Página intermedia del formulario"
                    className="w-full rounded-md"
                  />
                  <p className="text-xs text-gray-600 mt-1">Página intermedia</p>
                </div>
              )}
              
              {result.screenshots.final && (
                <div className="border border-gray-200 rounded-md p-2">
                  <img
                    src={result.screenshots.final}
                    alt="Confirmación del formulario"
                    className="w-full rounded-md"
                  />
                  <p className="text-xs text-gray-600 mt-1">Página final con número de referencia</p>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <h4 className="font-bold text-sm mb-2">Datos Enviados:</h4>
            <div className="text-xs space-y-1">
              <p><strong>Nombre:</strong> {firstName} {lastName}</p>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>Asunto:</strong> {subject}</p>
              <p><strong>Consulta:</strong> {inquiry}</p>
            </div>
          </div>
        </div>
      );
    } else if (result && !result.success) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-bold mb-2">❌ Error en el Procesamiento</h3>
          <p className="text-red-700 text-sm">{result.message}</p>
          {result.error && (
            <p className="text-red-600 text-xs mt-2">Error: {result.error}</p>
          )}
          {result.screenshot && (
            <div className="mt-3 space-y-2">
              <h4 className="font-bold text-sm text-red-800">Captura de pantalla del error:</h4>
              <div className="border border-gray-200 rounded-md p-2">
                <img
                  src={result.screenshot}
                  alt="Error en el formulario"
                  className="w-full rounded-md"
                />
              </div>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h3 className="text-gray-800 font-bold mb-2">⏳ Procesando...</h3>
          <p className="text-gray-700 text-sm">Automatizando el llenado y envío del formulario</p>
        </div>
      );
    }
  }

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Herramienta de Paleta de Colores</h2>
        {isSessionActive
          ? (
            colorPaletteOutput
              ? <FunctionCallOutput functionCallOutput={colorPaletteOutput} />
              : <p>Ask for advice on a color palette...</p>
          )
          : <p>Inicia la sesión para usar esta herramienta...</p>}
      </div>
      
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Automatización de Formularios</h2>
        <p className="text-sm text-gray-600 mb-4">
          Llena automáticamente el formulario de https://formsmarts.com/html-form-example
        </p>
        
        {isSessionActive
          ? (
            formAutomationOutput
              ? <FormAutomationDisplay
                  output={formAutomationOutput}
                  result={formProcessingResult}
                />
              : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">Dime tus datos y automatizaré el formulario:</p>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    <li>Tu nombre completo</li>
                    <li>Tu correo electrónico</li>
                    <li>El tipo de consulta (Ventas, Soporte, Feedback)</li>
                    <li>Tu mensaje o consulta</li>
                  </ul>
                  <p className="text-xs text-blue-600 font-medium">
                    🤖 Lo haré automáticamente por ti, no necesitas hacer nada manualmente.
                  </p>
                </div>
              )
          )
          : <p>Inicia la sesión para usar esta herramienta...</p>}
      </div>
    </section>
  );
}
