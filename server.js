//import "dotenv/config";
import express from "express";
import {NavigatorHelper} from "./navigator_helper.js";
import {AppController} from "./app.controller.js";

const app = express()
 let navInstance = new NavigatorHelper()
await navInstance.InitNavigator();
navInstance.StartWorkers();
const appController = new AppController()

app.use(async(req,res,next)=>{
if ( !req.browserInstance ){
    console.log("instace created");
    req.NavigatorHelper =  navInstance;
   
}
  next();
});

app.get('/', (req, res) => {
  res.send('RPA SERVIENTREGA');
})


app.get('/get-guia-data/:guia_id',appController.ObtnerDatosGuia)

app.listen(process.env.PORT || 8000,"0.0.0.0", () => {
  console.log(`Example app listening on port ${process.env.PORT || 8000}`)
})