import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from "n8n-workflow";

export class SmsMngrHeaderApi implements ICredentialType {
    name = "smsMngrHeaderApi";
    displayName = "SmsMngr API (Header)";
    properties: INodeProperties[] = [
        {
            displayName: "API Key",
            name: "apiKey",
            type: "string",
            default: "",
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: "generic",
        properties: {
            headers: {
                "x-api-key": "={{$credentials.apiKey}}",
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: "https://api.smsmngr.com/v2",
            url: "/apikey/me",
        },
    };
}
