import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export class FormAutomationService {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    if (!this.browser) {
      // 'new' headless mode es más estable para pintar screenshots
      this.browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });
    }
  }

  async fillAndSubmitForm(data) {
    try {
      await this.init();
      await this.page.goto('https://formsmarts.com/form/yx?mode=h5embed&lay=1', { waitUntil: 'networkidle2' });

      // --- Llenado ---
      const type = async (sel, val) => {
        await this.page.waitForSelector(sel);
        await this.page.type(sel, val);
      };

      await type('input[placeholder="Your first name"]', data.firstName);
      await type('input[placeholder="Your last name"]', data.lastName);
      await type('input[placeholder="Your email address"]', data.email);
      await type('textarea[placeholder="Your comment"]', data.inquiry);
      
      if (data.subject) await this.page.select('select', data.subject);

      // --- PASO 1: Primer Envío ---
      console.log('1. Click inicial...');
      await this.clickSubmit(); 
      await this.takeScreenshot('1_intermediate_page');

      // --- PASO 2: Confirmación ---
      console.log('2. Click de confirmación...');
      await this.delay(1000);  ///html/body/div[1]/div/form[2]/input[2]
      await this.page.waitForSelector('xpath=/html/body/div[1]/div/form[2]/input[2]', { visible: true });
      this.page.click('xpath=/html/body/div[1]/div/form[2]/input[2]');
      //await this.clickSubmit();
      
      // Espera vital para que cargue el iframe final antes de la foto/extracción
      await this.delay(2000);
      const intermediateScreenshot = await this.captureScreenshot();
      
      // --- PASO 3: Extracción ---
      const refNumber = await this.getReferenceNumber();
      const finalScreenshot = await this.captureScreenshot();

      return {
        success: true,
        referenceNumber: refNumber,
        screenshots: {
          intermediate: intermediateScreenshot,
          final: finalScreenshot
        }
      };

    } catch (error) {
      console.error('Error:', error.message);
      const errShot = await this.captureScreenshot();
      return { success: false, error: error.message, screenshot: errShot };
    } finally {
      await this.close();
    }
  }

  async clickSubmit() {
    // Esperamos selectores y navegación simultáneamente
    const submitBtn = 'input[type="submit"]';
    await this.page.waitForSelector(submitBtn, { visible: true });
    
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click(submitBtn)
    ]);
  }

  async getReferenceNumber() {
    try {
      await this.page.waitForSelector('#refnum', { timeout: 5000 });
      const refText = await this.page.$eval('#refnum', el => el.innerText);
      return refText.trim();
    } catch (e) {
      // Fallback si falla el iframe
      const bodyText = await this.page.$eval('body', el => el.innerText);
      const match = bodyText.match(/(?:Ref|ID|#)[:\s]+([A-Z0-9-]+)/i);
      return match ? match[1] : `UNK-${Date.now()}`;
    }
  }

  // Utilidad simple para pausas
  delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
  }

  async takeScreenshot(name) {
    const dir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const safeName = name.replace(/[^a-z0-9_-]/gi, '_');
    const fileName = `${safeName}_${Date.now()}.png`;
    const filePath = path.join(dir, fileName);
    await this.page.screenshot({ path: filePath, fullPage: true });
    return fileName; // Devolver solo el nombre del archivo, no la ruta completa
  }

  async captureScreenshot() {
    // Captura la screenshot y la devuelve como base64
    const screenshot = await this.page.screenshot({
      encoding: 'base64',
      fullPage: true
    });
    return `data:image/png;base64,${screenshot}`;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export default new FormAutomationService();