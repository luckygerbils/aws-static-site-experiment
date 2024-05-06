import { LambdaClient } from "@aws-sdk/client-lambda";
import { CognitoUserSession } from "amazon-cognito-identity-js";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

import { cognitoUserPool } from "@/userPool";
import { createSignedFetcher } from "./fetch";

let cachedLambdaClient: LambdaClient;
export function lambdaClient(): LambdaClient {
  if (cachedLambdaClient == null) {
    cachedLambdaClient = new LambdaClient({
      region: "us-west-2",
      credentials: credentials(),
    });
  }
  return cachedLambdaClient;
}

let cachedFetchClient: typeof fetch;
export function fetchClient(): typeof fetch {
  if (cachedFetchClient == null) {
    return createSignedFetcher({
      region: "us-west-2",
      credentials: credentials(),
      service: "lambda",
    });
  }
  return cachedFetchClient
}

function credentials() {
  const user = cognitoUserPool()?.getCurrentUser();
  if (user == null) {
    throw new Error("Illegal state: user is null");
  }

  return fromCognitoIdentityPool({
    clientConfig: { region: "us-west-2" }, // Configure the underlying CognitoIdentityClient.
    identityPoolId: window["config"].identityPoolId,
    logins: {
      [`cognito-idp.us-west-2.amazonaws.com/${window["config"].userPoolId}`]: () => {
        return new Promise<string>(
          (resolve, reject) => user.getSession(
            (err: Error, session: CognitoUserSession|null) => {
              if (session == null) {
                reject(err);
              } else {
                resolve(session.getIdToken().getJwtToken());
              }
            }));
      }
    },
  });
}