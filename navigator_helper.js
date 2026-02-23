import * as puppeteer from "puppeteer";
import { v4 as uuidv4 } from 'uuid';
import { AppServientregaUri, bestOptionByGrowingPrefixes } from "./utils/func_helpers.js";

export class NavigatorHelper {
   agentes_list =  [{
    user:"MARTILCU",
    pass:"Servi2025*"
   }]
   max_time_wait_limit = 200
   workers_started = false;
   cola_espera = []
   resolved_result = new Map();
   sesion_list = new Map();
   expired = new Set();
   is_instanced = false
    constructor(){}
    async InitNavigator() {
        console.log("launched navigator");

        //OCULTO
       /*  this.navigatorInstance = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"

            ]
        })  */


        //pantalla 
        this.navigatorInstance = await puppeteer.launch({
            headless: false, // 👈 IMPORTANTE
            defaultViewport: null, // opcional (abre maximizado)
            args: ['--start-maximized'] // opcional
        })
        this.is_instanced = true
    }
    async loginWorker(browser, user, pass, maxRetries = 3) {
        const actual_context = this.sesion_list.get(user);
        if ( actual_context ){
            const page = await actual_context.newPage();
            await page.goto(AppServientregaUri, { waitUntil: "networkidle2" });
            try {
            await page.waitForSelector('#txtUsuario', {
                visible: true,
                timeout: 6000
            });
            await actual_context.close();
            this.sesion_list.delete(user);
            }catch(e){
                 return actual_context;
            }finally{
                await page.close();
            }
        }
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const context = await browser.createBrowserContext();
            const page = await context.newPage();

            try {
                page.setDefaultTimeout(60000);

                await page.goto(AppServientregaUri, { waitUntil: "networkidle2" });

                await page.waitForSelector('#txtUsuario', { visible: true });
                await page.waitForSelector('#txtClave', { visible: true });
                await page.type('#txtUsuario', user, { delay: 50 });
                await page.type('#txtClave', pass, { delay: 50 });

                // captcha...
                await page.waitForSelector('#td_captcha p', { visible: true });
                let textQuestion = await page.$eval('#td_captcha p', el => el.textContent.trim());
                textQuestion = textQuestion
                    .replace("Seleccione el", "")
                    .replace("Seleccione la", "")
                    .replace("Seleccione los", "")
                    .replace("Seleccione las", "");

                const options = await page.$$eval('#td_captcha img', imgs =>
                    imgs.map(img => ({
                        img_name: img.src.split("/").at(-1).replace("icon", "").split(".").at(0),
                        element: img.parentElement.parentElement.getAttribute("id"),
                        score: 0
                    }))
                );

                const { best } = bestOptionByGrowingPrefixes(options, textQuestion);

                await page.click(`#${best.element}`);

                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2' }),
                    page.click('#btnAceptar'),
                ]);

                // Señal de “ya logueé”
                await page.waitForSelector('iframe#MenuFrame', { visible: true });

                await page.close(); // opcional: dejas limpio
                //return context; // ✅ context listo y con sesión
                this.sesion_list.set(user,context);
                return context;
            } catch (e) {
                console.log(`Login fail (attempt ${attempt}/${maxRetries}):`, e?.message);
                try { await page.close(); } catch { }
                try { await context.close(); } catch { }
            }
        }

        throw new Error("No se pudo hacer login después de varios intentos.");
    }

    async ResolvedRequest(workerId) {
        
       
        
         const processToRun = this.cola_espera.shift();
        if (processToRun ) {
            try {
                let has_login = true;
                try {
                    await this.loginWorker(processToRun.params[0], workerId.user, workerId.pass);
                } catch (e) {
                    has_login = false;
                    this.resolved_result.set(processToRun.pid,
                        {
                            pid: processToRun.pid,
                            response: null,
                            extra: e?.message || String(e),
                            msg: "Fallo al tratar de iniciar la sesion"
                        });
                    
                }
                if (has_login) {
                    const ctx = this.sesion_list.get(workerId.user);
                    let response;
                    try {
                        response = await processToRun.func_instance(ctx, processToRun.params[1]);
                    } catch (err) {
                        if (err.message === "SESSION_EXPIRED") {
                            await this.loginWorker(processToRun.params[0], workerId.user, workerId.pass);
                            response = await processToRun.func_instance(ctx, processToRun.params[1]);
                    } else {
                            throw err;
                        }
                    }

                    if (this.expired.has(processToRun.pid)) {
                        this.expired.delete(processToRun.pid);
                    } else {

                        this.resolved_result.set(processToRun.pid,
                            {
                                pid: processToRun.pid,
                                response,
                                msg: ""
                            })

                    }
                }
                
                
                
                
            } catch (error) {
                 this.resolved_result.set(processToRun.pid,
                    {   pid:processToRun.pid,
                        response:null,
                        extra:error?.message || String(error),
                        msg:"LOGIN_ERROR"
                    })

            }
        }
        setTimeout(() => {
            this.ResolvedRequest(workerId)
        }, 1000)
    }

    StartWorkers(n = this.max_limit_windows) {
        if (this.workers_started) return;
        this.workers_started = true;
        this.agentes_list.forEach( agente=>{
            this.ResolvedRequest(agente)
        } )
    }
    
     RunRequest(func_instance,params){
        const pid =  uuidv4()
        this.cola_espera.push({
            pid:pid,
            func_instance,
            params
        });
        return new Promise( resolve=>{
            let seconds = 0
            const interval = setInterval(()=>{
                seconds += 1
                if ( seconds >= this.max_time_wait_limit ){
                    this.expired.add(pid);
                    clearInterval(interval);
                    resolve({
                        pid,
                        response:null,
                        msg:"TIMEOUT_ERR"
                    });
                    return;
                }

                const responseResolved = this.resolved_result.get(pid)

                if ( responseResolved ){
                    clearInterval(interval)
                    this.resolved_result.delete(pid)
                    resolve({
                        pid,
                        response:responseResolved.response,
                        msg:"RESUELTO"
                    })
                  
                   
                }

                
            },1000);
        } )
        
    }


}


