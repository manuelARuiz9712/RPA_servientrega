import { getGuia } from "./dto/getGuia.js";


export class AppController {


    async ObtnerDatosGuia(req, res) {
        const { guia_id } = req.params;
        console.log("resolve");
        console.log(req.NavigatorHelper.navigatorInstance)
        const result = await req.NavigatorHelper.RunRequest(
            getGuia,
            [req.NavigatorHelper.navigatorInstance, guia_id]
        );

        res.json(result);

    }


}