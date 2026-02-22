import * as puppeteer from "puppeteer";
import { v4 as uuidv4 } from 'uuid';

export class NavigatorHelper {
   max_limit_windows = 5
   max_time_wait_limit = 60
   workers_started = false;
   cola_espera = []
   resolved_result = new Map()
   expired = new Set()
    constructor(){}
    async InitNavigator() {
        console.log("launched navigator");
        this.navigatorInstance = await puppeteer.launch({
            dumpio: true,
            timeout: 120000,
            //headless: false, // en Windows, para depurar es mejor verlo
            // defaultViewport: { width: 1366, height: 768 },
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
/*                 "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-zygote",
                "--single-process" */
            ]
        })
    }

    async ResolvedRequest(workerId) {
       
        const processToRun = this.cola_espera.shift();

        if (processToRun) {
            try {
                const response = await processToRun.func_instance(...processToRun.params);
                console.log({response});
                if (this.expired.has( processToRun.pid )) {
                    this.expired.delete( processToRun.pid );
                }else{

                    this.resolved_result.set(processToRun.pid,
                    {   pid:processToRun.pid,
                        response,
                        msg:""
                    })

                }
                
                
            } catch (error) {
                 this.resolved_result.set(processToRun.pid,
                    {   pid:processToRun.pid,
                        response:null,
                        extra:error?.message || String(error),
                        msg:"Ah Ocurrido un error al tratar de ejecutar la funcion"
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

        for (let i = 0; i < n; i++) {
            this.ResolvedRequest(i);
        }
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
                        msg:"resuelto"
                    })
                  
                   
                }

                
            },1000);
        } )
        
    }


}


