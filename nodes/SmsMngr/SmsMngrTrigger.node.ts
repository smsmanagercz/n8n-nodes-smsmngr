import {
    IWebhookFunctions,
    INodeType,
    INodeTypeDescription,
    INodeExecutionData,
    IWebhookResponseData,
    IDataObject,
    NodeConnectionType,
} from "n8n-workflow";

export class SmsMngrTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: "SmsMngr Trigger",
        name: "smsMngrTrigger",
        icon: "file:smsmngr.svg",
        group: ["trigger"],
        version: 2,
        description: "Handles incoming webhook callbacks from SmsMngr",
        defaults: { name: "SmsMngr Trigger" },
        inputs: [],
        outputs: [NodeConnectionType.Main],
        properties: [],
        webhooks: [{
            name: "default",
            httpMethod: "POST",
            responseMode: "onReceived",
            path: "smsmngr"
        }],
    };

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const raw = this.getBodyData();
        const records: IDataObject[] = Array.isArray(raw)
            ? raw as IDataObject[]
            : (raw?.notifications as IDataObject[]) ?? [raw as IDataObject];
        const items: INodeExecutionData[] = records.map(r => ({ json: r }));
        return { workflowData: [items] };
    }
}
