import express from "express";
import { NavigatorHelper } from "./navigator_helper.js";
import { AppController } from "./app.controller.js";

const app = express();
const port = Number(process.env.PORT) || 8080;

const appController = new AppController();

let navInstance  = new NavigatorHelper();

// health + root rápidos (para que el startup probe pase)
app.get("/", (req, res) => res.send("RPA SERVIENTREGA"));
app.get("/healthz", (req, res) => res.status(200).send("ok"));

app.use((req, res, next) => {
  req.NavigatorHelper = navInstance; // puede ser null al inicio
  next();
});

app.get("/get-guia-data/:guia_id", appController.ObtnerDatosGuia);

app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on ${port}`);

  // Inicializa el navegador DESPUÉS de escuchar el puerto
  (async () => {
    try {
      
      await navInstance.InitNavigator();
      navInstance.StartWorkers();
      console.log("Navigator ready");
    } catch (err) {
      console.error("Navigator init failed:", err);
      // decide si quieres matar el proceso o seguir sirviendo endpoints básicos
      // process.exit(1);
    }
  })();
});