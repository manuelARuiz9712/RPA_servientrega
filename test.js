import axios from "axios";
import crypto from 'crypto';
import {writeFile} from "fs/promises";
function numericId(length) {
  const bytes = crypto.randomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += (bytes[i] % 10).toString();
  }

  return result;
}

let run_params = {
    max_request:10,
    values:[{
        is_mock:false,
        value:"2178767343"
    },{
        is_mock:false,
        value:"9186040922"
    },{
        is_mock:false,
        value:"2178767341"
    }],
    mocks:false,
    
}

if ( run_params.mocks ){
    Array.from({length:run_params.max_request - run_params.values.length}).forEach(()=>{
        run_params.values.push({
            is_mock:true,
            value:numericId(15)
        })
    })
}
console.log(`TOTAL ITEMS TO QUERY: ${ run_params.values.length }`);
console.time("PROGRAM_RUN")
let result_set = [];
const status_data = {
    "RESUELTO_WITH_DATA":"RESUELTO_WITH_DATA",//el api responde con datos, realizo la consulta y encontro registros
    "RESUELTO_WITH_ERROR":"RESUELTO_WITH_ERROR",// realizo la consulta y no devolvio registros
    "TIMEOUT_SERVICE":"TIMEOUT_SERVICE",// realizo la consulta y no devolvio registros
    "ERROR_QUERY_API":"ERROR_QUERY_API"
}
await Promise.all( run_params.values.map( async (item,item_index)=>{
    const start_time = Date.now();
     try{
        

        const {data} = await axios.get(`http://localhost:8080/get-guia-data/${item.value}`);
        const end_time = Date.now();
        const durationSeconds = (end_time - start_time) / 1000; //segundos
        if( data.msg === 'RESUELTO'  ){

            if (  data.response && data.response?.status !== 'ERROR'  ){
                result_set.push({
                res_status:status_data.RESUELTO_WITH_DATA,
                query_param:item.value,
                response:data.response,
                time:durationSeconds
            })
            }else{
                 result_set.push({
                res_status:status_data.RESUELTO_WITH_ERROR,
                query_param:item.value,
                response:data,
                time:durationSeconds
            })
            }
            
        }else{
            const end_time = Date.now();
            const durationSeconds = (end_time - start_time) / 1000; //segundos
            result_set.push({
                        res_status:status_data.TIMEOUT_SERVICE,
                        query_param:item.value,
                        time:durationSeconds,
                        response:data.response
                    })
          
        }
        

       

     }catch(e){
            const end_time = Date.now();
            const durationSeconds = (end_time - start_time) / 1000; //segundos
            result_set.push({
                        res_status:status_data.ERROR_QUERY_API,
                        query_param:item.value,
                        time:durationSeconds,
                        response:e.message
                    })
        
     }
}));

console.timeEnd("PROGRAM_RUN")


result_set.sort( (a,b)=>{
    return a.time - b.time
} );

try{
    await writeFile("eval.test.json",JSON.stringify(result_set))
    console.log("TEST  GUARDADO");
}catch(e){
     console.log("ERROR AL TRATAR DE GUARDAR EL TEST");
}

let test_success = 0;
let list_test = run_params.values.map( item=>item.value );
const resulSetReport = result_set.reduce((accum,item)=>{
    accum[ item.res_status ] += 1;
    if ( list_test.includes(item.query_param) && item.res_status === status_data.RESUELTO_WITH_DATA   ){
        test_success = test_success +1;
    }
    return accum
},{
   [status_data.RESUELTO_WITH_DATA]:0,
   [status_data.ERROR_QUERY_API]:0,
   [status_data.RESUELTO_WITH_ERROR]:0,
   [status_data.TIMEOUT_SERVICE]:0

});

let timeResult = {
    ...resulSetReport,
    test_success,
    max_time_response:result_set.at(-1).time,
    min_time_response:result_set.at(0).time,

}

console.table(timeResult)