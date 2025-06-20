import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IDataObject,
    IRequestOptions,
    NodeConnectionType,
} from "n8n-workflow";

export class SmsMngr implements INodeType {
    description: INodeTypeDescription = {
        displayName: "SmsMngr",
        name: "smsMngr",
        icon: "file:smsmngr.svg",
        group: ["transform"],
        version: 4,
        description: "Send WhatsApp (text / template) or SMS messages through SmsManager.com",
        defaults: { name: "SmsMngr" },
        inputs: ['main'] as NodeConnectionType[],
        outputs: ['main'] as NodeConnectionType[],
        credentials: [{ name: "smsMngrHeaderApi", required: true }],
        properties: [
            {
                displayName: "Callback Strategy",
                name: "callbackStrategy",
                type: "options",
                default: "manual",
                options: [
                    { name: 'Manual URL', value: 'manual' },
                    { name: 'Use "SmsMngr Trigger"', value: 'trigger' }
                ],
            },
            {
                displayName: "Callback URL",
                name: "callbackManual",
                type: "string",
                default: "",
                displayOptions: { show: { callbackStrategy: ["manual"] } },
            },
            {
                displayName: "Trigger Node Name",
                name: "callbackTrigger",
                type: "string",
                default: "",
                description: "Enter the name of an existing SmsMngr Trigger in this workflow",
                displayOptions: { show: { callbackStrategy: ["trigger"] } },
            },

            /* ---------- recipient & channel ---------- */
            {
                displayName: "Recipient (phone #)",
                name: "recipient",
                type: "string",
                required: true,
                default: "",
                placeholder: "420605123456",
            },
            {
                displayName: "Delivery Channel",
                name: "channel",
                type: "options",
                required: true,
                options: [
                    { name: "WhatsApp Text", value: "waText" },
                    { name: "WhatsApp Template", value: "waTemplate" },
                    { name: "SMS", value: "sms" }
                ],
                default: "waText",
            },
            {
                displayName: "WA Sender ID",
                name: "waSender",
                type: "string",
                required: true,
                default: "",
                displayOptions: { show: { channel: ["waText"] } },
            },
            {
                displayName: "Message Body",
                name: "waBody",
                type: "string",
                typeOptions: { rows: 4 },
                required: true,
                default: "",
                displayOptions: { show: { channel: ["waText"] } },
            },
            {
                displayName: "Template Name",
                name: "tplName",
                type: "string",
                required: true,
                default: "",
                displayOptions: { show: { channel: ["waTemplate"] } },
            },
            {
                displayName: "Language Code",
                name: "tplLang",
                type: "string",
                default: "en",
                displayOptions: { show: { channel: ["waTemplate"] } },
            },
            {
                displayName: "WA Sender ID",
                name: "tplSender",
                type: "string",
                required: true,
                default: "",
                displayOptions: { show: { channel: ["waTemplate"] } },
            },
            {
                displayName: "Template Parameters",
                name: "tplParams",
                type: "string",
                typeOptions: { multipleValues: true },
                default: "",
                description: "Comma-separated list (param1, param2, …)",
                displayOptions: { show: { channel: ["waTemplate"] } },
            },
            {
                displayName: "SMS Sender (alpha / #)",
                name: "smsSender",
                type: "string",
                default: "",
                displayOptions: { show: { channel: ["sms"] } },
            },
            {
                displayName: "Gateway Priority",
                name: "smsGateway",
                type: "options",
                default: "high",
                options: [
                    { name: "High", value: "high" },
                    { name: "Low", value: "low" }
                ],
                displayOptions: { show: { channel: ["sms"] } },
            },
            {
                displayName: "Message Body",
                name: "smsBody",
                type: "string",
                typeOptions: { rows: 4 },
                required: true,
                default: "",
                displayOptions: { show: { channel: ["sms"] } },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const results: IDataObject[] = [];

        for (let i = 0; i < items.length; i++) {
            const strategy = this.getNodeParameter('callbackStrategy', i) as string;
            let callback = '';
            if (strategy === 'manual') {
                callback = (this.getNodeParameter('callbackManual', i) as string).trim();
            } else {
                const triggerName = this.getNodeParameter('callbackTrigger', i) as string;
                callback = (this as any).getNodeWebhookUrl(triggerName, 'default');
                if (!callback) throw new Error('Callback not found - are you sure the trigger is connected?');
            }

            const channel = this.getNodeParameter('channel', i) as string;
            const recipient = this.getNodeParameter('recipient', i) as string;

            let flow: IDataObject = {};
            let bodyField: string | undefined;

            switch (channel) {
                case 'waText': {
                    const waSender = this.getNodeParameter('waSender', i) as string;
                    const waBody = this.getNodeParameter('waBody', i) as string;
                    flow = { whatsapp_text: { sender: waSender } };
                    bodyField = waBody;
                    break;
                }
                case 'waTemplate': {
                    const tplName = this.getNodeParameter('tplName', i) as string;
                    const tplLang = this.getNodeParameter('tplLang', i) as string;
                    const tplSender = this.getNodeParameter('tplSender', i) as string;
                    const rawParams = this.getNodeParameter('tplParams', i) as string;
                    const params = rawParams.split(',').map((p) => p.trim()).filter(Boolean);
                    flow = {
                        whatsapp_template: {
                            template_name: tplName,
                            language: tplLang,
                            sender: tplSender,
                            params,
                        },
                    };
                    break;
                }
                case 'sms': {
                    const smsSender = this.getNodeParameter('smsSender', i) as string;
                    const smsGateway = this.getNodeParameter('smsGateway', i) as string;
                    const smsBody = this.getNodeParameter('smsBody', i) as string;
                    flow = { sms: { sender: smsSender, gateway: smsGateway } };
                    bodyField = smsBody;
                    break;
                }
            }

            const requestBody: IDataObject = {
                callback,
                to: [{ phone_number: recipient }],
                flow: [flow],
            };
            if (bodyField) requestBody.body = bodyField;

            const options: IRequestOptions = {
                method: 'POST',
                uri: 'https://api.smsmngr.com/v2/message',
                body: requestBody,
                json: true,
            };

            const response = await this.helpers.requestWithAuthentication.call(
                this,
                'smsMngrHeaderApi',
                options,
            );
            results.push(response as IDataObject);
        }

        return [this.helpers.returnJsonArray(results)];
    }
}
