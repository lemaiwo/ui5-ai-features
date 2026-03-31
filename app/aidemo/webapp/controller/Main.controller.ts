import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace be.wl.ai.aidemo.controller
 */
export default class Main extends Controller {

    public onInit(): void {
        this.getView()?.setModel(new JSONModel({
            sourceText: "",
            compareText1: "",
            compareText2: "",
            suggestionText: "",
            autoCompleteText: "",
            sentimentText: ""
        }));
    }
}
