import { InvokeCommand } from "@aws-sdk/client-lambda";
import { fetchClient, lambdaClient } from "./client/lambda";

export async function callJson(payload: object) {
    const result = await lambdaClient().send(new InvokeCommand({
        FunctionName: config.functionName,
        Payload: JSON.stringify(payload)
      }))
    return JSON.parse(new TextDecoder("utf-8").decode(result.Payload));
}

export async function callJsonFetch() {
    const result = await fetchClient()("/api")
    return await result.json();
}