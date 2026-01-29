import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Carga un system prompt desde un archivo .md o .yaml
 * @param {string} filename - Nombre del archivo sin extensión
 * @returns {string} - El contenido del system prompt
 */
export function loadSystemPrompt(filename = 'default') {
  const systemPromptsDir = path.join(process.cwd(), 'system_prompts');
  
  // Intentar cargar como .yaml primero
  const yamlPath = path.join(systemPromptsDir, `${filename}.yaml`);
  if (fs.existsSync(yamlPath)) {
    try {
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      const data = yaml.load(yamlContent);
      
      // Si tiene system_prompt_final, usarlo, si no construirlo
      if (data.system_prompt_final) {
        return data.system_prompt_final;
      }
      
      // Construir el prompt desde las propiedades YAML
      let prompt = '';
      if (data.name) prompt += `Nombre: ${data.name}\n\n`;
      if (data.role) prompt += `Rol: ${data.role}\n\n`;
      if (data.instructions) prompt += `Instrucciones:\n${data.instructions}\n\n`;
      if (data.personality) {
        prompt += `Personalidad:\n`;
        if (data.personality.tone) prompt += `- Tono: ${data.personality.tone}\n`;
        if (data.personality.expertise) prompt += `- Expertise: ${data.personality.expertise.join(', ')}\n`;
        prompt += '\n';
      }
      if (data.guidelines) {
        prompt += `Directrices:\n`;
        data.guidelines.forEach(guideline => {
          prompt += `- ${guideline}\n`;
        });
        prompt += '\n';
      }
      if (data.capabilities) {
        prompt += `Capacidades:\n`;
        data.capabilities.forEach(capability => {
          prompt += `- ${capability}\n`;
        });
        prompt += '\n';
      }
      
      return prompt.trim();
    } catch (error) {
      console.error(`Error reading YAML file ${yamlPath}:`, error);
    }
  }
  
  // Intentar cargar como .md
  const mdPath = path.join(systemPromptsDir, `${filename}.md`);
  if (fs.existsSync(mdPath)) {
    try {
      const mdContent = fs.readFileSync(mdPath, 'utf8');
      // Eliminar el título y formato markdown, dejar solo el contenido
      return mdContent
        .replace(/^#\s+.*$/gm, '') // Eliminar títulos
        .replace(/^\s*[-*+]\s+/gm, '') // Eliminar listas
        .replace(/^\s*\d+\.\s+/gm, '') // Eliminar listas numeradas
        .replace(/^\s*##\s+.*$/gm, '') // Eliminar subtítulos
        .replace(/^\s*###\s+.*$/gm, '') // Eliminar sub-subtítulos
        .replace(/^\s*####\s+.*$/gm, '') // Eliminar sub-sub-subtítulos
        .replace(/^\s*\*\*.*?\*\*:\s*/gm, '') // Eliminar texto en negrita seguido de :
        .replace(/^\s*_.*_:\s*/gm, '') // Eliminar texto en cursiva seguido de :
        .replace(/^\s*`.*`:\s*/gm, '') // Eliminar código seguido de :
        .replace(/\n\s*\n/g, '\n') // Reducir múltiples saltos de línea a uno
        .trim();
    } catch (error) {
      console.error(`Error reading MD file ${mdPath}:`, error);
    }
  }
  
  // Si no se encuentra ningún archivo, devolver un prompt por defecto
  return `Eres un asistente de voz inteligente y amigable. Ayuda a los usuarios de manera eficiente y conversacional, siempre respondiendo en español.`;
}

/**
 * Obtiene la lista de system prompts disponibles
 * @returns {string[]} - Lista de nombres de archivos sin extensión
 */
export function getAvailableSystemPrompts() {
  const systemPromptsDir = path.join(process.cwd(), 'system_prompts');
  
  if (!fs.existsSync(systemPromptsDir)) {
    return ['default'];
  }
  
  const files = fs.readdirSync(systemPromptsDir);
  const prompts = new Set();
  
  files.forEach(file => {
    const ext = path.extname(file);
    const name = path.basename(file, ext);
    if (ext === '.md' || ext === '.yaml' || ext === '.yml') {
      prompts.add(name);
    }
  });
  
  return Array.from(prompts).sort();
}