import * as puppeteer from "puppeteer";
import {similarity,leftSimilarity,scoreMatch, bestOptionByGrowingPrefixes} from "../utils/func_helpers.js";

export const  getGuia = async(browser,guia_id)=>{
    console.log("get guia");
    console.log(browser)
    const page = await browser.newPage();
    const url = "https://apps.servientrega.com/SismilenioNET/Ingreso.aspx";
  try {

    page.setDefaultTimeout(120000);              // waits de selectors, etc.
    page.setDefaultNavigationTimeout(120000);    // goto / waitForNavigation
    try {
  const r = await fetch("https://apps.servientrega.com/SismilenioNET/Ingreso.aspx", { redirect: "follow" });
  console.log("STATUS:", r.status);
  const t = await r.text();
  console.log("HEAD:", t.slice(0, 200));
} catch (e) {
  console.log("FETCH ERROR:", e?.name, e?.message);
  console.log("CAUSE:", e?.cause);          // <- aquí suele decir ENOTFOUND, ECONNRESET, ETIMEDOUT, etc
  console.log("STACK:", e?.stack);
}
    await page.goto(url, { waitUntil: "domcontentloaded" });
    page.on("requestfailed", req =>
  console.log("REQ FAILED:", req.url(), req.failure()?.errorText)
);

const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
console.log("GOTO STATUS:", resp?.status());
console.log("FINAL URL:", page.url());
console.log("TITLE:", await page.title());    

    await page.waitForSelector('#txtUsuario', { visible: true });
    await page.waitForSelector('#txtClave', { visible: true });
    await page.type('#txtUsuario',"MARTILCU", { delay: 50 });
    await page.type('#txtClave',"Servi2025*", { delay: 50 });
    await page.waitForSelector('#td_captcha', { visible: true });
    await page.waitForSelector('#td_captcha p', { visible: true });
    let textQuestion =  await page.$eval('#td_captcha p', el => el.textContent.trim());
    textQuestion = textQuestion.replace("Seleccione el","")
    let options = await page.$$eval('#td_captcha img', imgs =>
    imgs.map(img => {
        const img_name = img.src.split("/").at(-1).replace("icon","").split(".").at(0)
        
        return {
            img_name:img_name,
            element:img.parentElement.parentElement.getAttribute("id"),
            score:0
        }
    })
    );
    console.log({options,textQuestion})
    const { best, scored } = bestOptionByGrowingPrefixes(options, textQuestion);

    console.log({ best, scored });

    await page.waitForSelector(`#${best.element}`, { visible: true });
    await page.click(`#${best.element}`);
/*     const option_to_select = options.map(op=>({
        ...op,
        score:scoreMatch(op.img_name,textQuestion)
    })).sort( (a,b)=>{
        return  b.score - a.score
    } )[0]
    console.log("option",option_to_select)
    await page.waitForSelector(`#${option_to_select.element}`, { visible: true });
    await page.click(`#${option_to_select.element}`); */
    await page.waitForSelector("#btnAceptar")
    //await page.click("#btnAceptar")
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('#btnAceptar')
        ]);
    await page.waitForSelector('iframe#MenuFrame', { visible: true });
    const handleMenuFrame = await page.$('iframe#MenuFrame');
    const menuFrame = await handleMenuFrame.contentFrame();
    await menuFrame.waitForSelector('#treeViewMenu', { visible: true });
    await menuFrame.evaluate(() => {
        const el = Array.from(document.querySelectorAll('#treeViewMenu a'))
            .find(a => a.textContent.trim() === '01-Registro llamada');
        if (el) el.click();
    });

    await page.waitForSelector('iframe#ContentFrame', { visible: true });
    const handleContenFrame = await page.$('iframe#ContentFrame');
    const contentFrame = await handleContenFrame.contentFrame();
    await contentFrame.waitForSelector('#Menu1_btnRastreo', { visible: true });
    await contentFrame.click('#Menu1_btnRastreo');
    await contentFrame.waitForSelector('#txtGuia', { visible: true });
    await contentFrame.type("#txtGuia",guia_id,{delay:50})
    await contentFrame.waitForSelector('#btnBuscar', { visible: true });
    let dialog = null;

    const dialogPromise = new Promise(resolve => {
    page.once('dialog', resolve);
    });

    await contentFrame.click('#btnBuscar');

    dialog = await Promise.race([
    dialogPromise,
    new Promise(resolve => setTimeout(() => resolve(null), 3000))
    ]);

    if (dialog) {
    const msg = dialog.message();
    await dialog.accept();

    if (msg.includes('Guia no encontrada')) {
        return {
            "status":"GUIA_INVALIDA",
            "msg_errr":"El numero de la guia no fue encontrado",
            "payload_fecha_envio":"",
            "payload_origen":"",
            "payload_destino":"",
            "payload_estado_actual":"",
            "payload_recibido_por":"",
            "payload_movimientos":[]
        }
        console.log('➡️ Caso controlado: guía inválida');
        // aquí decides: reintentar, cambiar guía, registrar error, etc.
    }
    } else {
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLFECHAENVIOExtra', { visible: true });
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLORIGENExtra', { visible: true });
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLDESTINOExtra', { visible: true });
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLESTADOACTUALExtra', { visible: true });
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLRECIBIOExtra', { visible: true });
        await contentFrame.waitForSelector('#dgMovimientos', { visible: true });
        
        const FECHA_ENVIO = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLFECHAENVIOExtra', el => el.textContent.trim());
        const ORIGEN = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLORIGENExtra', el => el.textContent.trim());
        const DESTINO = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLDESTINOExtra', el => el.textContent.trim());
        const ESTADO_ACTUAL = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLESTADOACTUALExtra', el => el.textContent.trim());
        const PERSONA_RECIBE = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLRECIBIOExtra', el => el.textContent.trim());


        const rows = await contentFrame.$$eval('#dgMovimientos tr.tdResultadosPar, #dgMovimientos tr.tdResultadosImpar', trs =>
        trs.map(tr => {
            const tds = Array.from(tr.querySelectorAll('td'));

            const a = tds[0]?.querySelector('a');
            const estado = (a?.textContent || tds[0]?.textContent || '').trim();

            return {
            estado, // "REPORTADO ENTREGADO"
            origen: (tds[1]?.textContent || '').trim(),
            destino: (tds[2]?.textContent || '').trim(),
            pieza: (tds[3]?.textContent || '').trim(),
            fecha: (tds[4]?.textContent || '').trim(),
            };
        })
);
    return {
            "status":"OK",
            "msg_errr":"",
            "payload_fecha_envio":FECHA_ENVIO,
            "payload_origen":ORIGEN,
            "payload_destino":DESTINO,
            "payload_estado_actual":ESTADO_ACTUAL,
            "payload_recibido_por":PERSONA_RECIBE,
            "payload_movimientos":rows
        }
    console.log('No hubo diálogo; continuar flujo normal');
    }



  } catch (e) {
    console.log(`ERROR : ${e.stack || e.message}`);
        return {
        "status":"ERROR",
        "msg_errr":`ERROR: ${e.stack || e.message}`,
        "payload_fecha_envio":"",
        "payload_origen":"",
        "payload_destino":"",
        "payload_estado_actual":"",
        "payload_recibido_por":"",
        "payload_movimientos":[]
    }
    
  } finally {
    if (page) await page.close();
    
  }


}