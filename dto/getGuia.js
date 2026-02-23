import * as puppeteer from "puppeteer";
import {similarity,leftSimilarity,scoreMatch,bestOptionByGrowingPrefixes, AppServientregaUri} from "../utils/func_helpers.js";

export const  getGuia = async(browserContext,guia_id)=>{
    console.log({browserContext});
    const page = await browserContext.newPage();
   
  try {

    page.setDefaultTimeout(60000);
    await page.goto(AppServientregaUri, { waitUntil: "networkidle2" });
    // Detectar si nos redirigió al login
    const isLogin = await page.$("#txtUsuario");
    if (isLogin) {
        throw new Error("SESSION_EXPIRED");
    }
    
    const handleMenuFrame = await page.$('iframe#MenuFrame');
    if (!handleMenuFrame) throw new Error("MENUFRAME_NOT_FOUND");
    const menuFrame = await handleMenuFrame.contentFrame();
    if (!menuFrame) throw new Error("MENUFRAME_NOT_READY");
    await menuFrame.waitForSelector('#treeViewMenu', { visible: true });
    await menuFrame.evaluate(() => {
        const el = Array.from(document.querySelectorAll('#treeViewMenu a'))
            .find(a => a.textContent.trim() === '01-Registro llamada');
        if (el) el.click();
    });

    await page.waitForSelector('iframe#ContentFrame', { visible: true });
    let handleContenFrame = await page.$('iframe#ContentFrame');
    let contentFrame = await handleContenFrame.contentFrame();
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
    console.log("not dialog");
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
        await page.waitForSelector('iframe#ContentFrame', { visible: true });
        handleContenFrame = await page.$('iframe#ContentFrame');
        contentFrame = await handleContenFrame.contentFrame();
        
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLFECHAENVIOExtra', { visible: true });
        const FECHA_ENVIO = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLFECHAENVIOExtra', el => el.textContent.trim());
        
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLORIGENExtra', { visible: true });
        const ORIGEN = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLORIGENExtra', el => el.textContent.trim());
        
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLDESTINOExtra', { visible: true });
        const DESTINO = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLDESTINOExtra', el => el.textContent.trim());
       
        await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLESTADOACTUALExtra', { visible: true });
        const ESTADO_ACTUAL = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLESTADOACTUALExtra', el => el.textContent.trim());

  
        let PERSONA_RECIBE = '';
        if (ESTADO_ACTUAL === 'ENTREGADO') {
            await contentFrame.waitForSelector('#tblEncabezadoGuiaExtra #LBLRECIBIOExtra', { visible: true });
            PERSONA_RECIBE = await contentFrame.$eval('#tblEncabezadoGuiaExtra #LBLRECIBIOExtra', el => el.textContent.trim());

        }
       
        await contentFrame.waitForSelector('#dgMovimientos', { visible: true });
        
        

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
if (page) await page.close();
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