import { CognitoUserPool } from "amazon-cognito-identity-js";

let pool: CognitoUserPool;
export function cognitoUserPool() {
  if (pool == null && globalThis.config != null) {
    pool = new CognitoUserPool({
        UserPoolId: config.userPoolId,
        ClientId: config.userPoolClientId,
        Storage: localStorage,
    });
  }
  return pool;
}