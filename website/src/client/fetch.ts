import type { AwsCredentialIdentity, Provider } from "@aws-sdk/types";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";

export type SignedFetcherOptions = {
	service: string;
	region?: string;
	credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
};

/**
 * Create a signed fetch function that automatically signs requests with AWS Signature V4.
 * Service and region must be provided. Credentials can be provided if you want to sign requests with a specific set of credentials.
 * If no credentials are provided, the default credentials from `@aws-sdk/credential-provider-node` will be used.
 * See: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/request-signing.html#request-signing-node
 * @param init
 * @returns fetch
 */
export function createSignedFetcher (
	opts: SignedFetcherOptions,
): typeof fetch {
	return async (input, init?) => {
		const service = opts.service;
		const region = opts.region || "us-west-2";
		const credentials = opts.credentials;

		const url = new URL(
			typeof input === "string"
				? input
				: input instanceof URL
				  ? input.href
				  : input.url,
            location.href,
		);

		const headers = new Headers(init?.headers);
		// host is required by AWS Signature V4: https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
		headers.append("host", url.host);

		const request = new HttpRequest({
			hostname: url.hostname,
			path: url.pathname,
			protocol: url.protocol,
			port: url.port ? Number(url.port) : undefined,
			username: url.username,
			password: url.password,
			method: init?.method?.toUpperCase() ?? "GET", // method must be uppercase
			body: init?.body,
			query: Object.fromEntries(url.searchParams.entries()),
			fragment: url.hash,
			headers: Object.fromEntries(headers.entries()),
		});

		const signer = new SignatureV4({
			credentials,
			service,
			region,
			sha256: Sha256,
		});

		const signedRequest = await signer.sign(request);

		return fetch(url, {
			...init,
			headers: signedRequest.headers,
			body: signedRequest.body,
			method: signedRequest.method,
		});
	};
};