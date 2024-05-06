interface Config {
    userPoolId: string,
    userPoolClientId: string,
    identityPoolId: string,
    functionName: string,
}

declare namespace NodeJS {
    export interface Global {
        config: Config;
    }
}

declare var config: Config;
