import * as cdk from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy, Function as CloudFrontFunction, FunctionCode, FunctionEventType } from 'aws-cdk-lib/aws-cloudfront';
import { FunctionUrlOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AccountRecovery, Mfa, UserPool, UserPoolClient, UserPoolClientIdentityProvider, UserPoolEmail, UserPoolIdentityProvider } from 'aws-cdk-lib/aws-cognito';
import { ARecord, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { IdentityPool, UserPoolAuthenticationProvider } from '@aws-cdk/aws-cognito-identitypool-alpha';
import { Code, Function, FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import fs = require('fs');
import path = require('path');

interface StaticSiteStackProps {
}

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: Construct, props: StaticSiteStackProps = {}) {
    super(scope, "AwsStaticSiteExperimentStack", {
      crossRegionReferences: true,
    });

    const usEast1Stack = new cdk.Stack(scope, "UsEast1Stack", {
      env: { region: "us-east-1" },
    });

    const anastaSi = PublicHostedZone.fromHostedZoneAttributes(this, "AnastaSi", {
      hostedZoneId: "Z3PODT6L2Y6659",
      zoneName: "anasta.si",
    })

    const staticSiteBucket = new Bucket(this, "StaticSiteBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dataBucket = new Bucket(this, "DataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      mfa: Mfa.OPTIONAL,
    });

    const userPoolClient = new UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: {
        userSrp: true,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
      ]
    });

    const identityPool = new IdentityPool(this, "IdentityPool", {
      authenticationProviders: {
        userPools: [ new UserPoolAuthenticationProvider({ userPool, userPoolClient }) ],
      },
    });

    const lambda = new Function(this, "TestFunction", {
      runtime: Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: Code.fromAsset("../lambda"),
      environment: {
        DATA_BUCKET: dataBucket.bucketName,
      }
    });
    lambda.role!.addToPrincipalPolicy(new PolicyStatement({
      actions: [ "s3:List*" ],
      resources: [ "*" ],
    }))
    const lambdaFunctionUrl = lambda.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
    })

    identityPool.authenticatedRole.addToPrincipalPolicy(new PolicyStatement({
      actions: [ "lambda:InvokeFunction" ],
      resources: [ lambda.functionArn, ],
    }))
    lambda.grantInvoke(identityPool.authenticatedRole);
    dataBucket.grantPut(lambda.grantPrincipal);

    const domainName = "static-site-experiment.anasta.si";
    const certificate = new Certificate(usEast1Stack, "StaticSiteCertificate", {
      domainName,
      validation: CertificateValidation.fromDns(anastaSi),
    });

    const cloudfrontOriginAccessIdentity = new OriginAccessIdentity(this, 'CloudFrontOriginAccessIdentity');
    const cloudFrontDistribution = new Distribution(this, 'CloudFrontDistribution', {
      certificate: certificate,
      domainNames: [ domainName ],
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3Origin(staticSiteBucket, {
            originAccessIdentity: cloudfrontOriginAccessIdentity
        }),
        functionAssociations: [{
            function: new CloudFrontFunction(this, 'Function', {
              code: FunctionCode.fromInline((
                // @ts-ignore
                function handler(event) {
                    var request = event.request;
                    if (request.uri.endsWith('/')) {
                        request.uri += 'index.html';
                    }
                    return request;
                }).toString()
              ),
            }),
            eventType: FunctionEventType.VIEWER_REQUEST
        }],
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // responseHeadersPolicy: responseHeaderPolicy
      },
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: "/404.html"
        }
      ],
      additionalBehaviors: {
        "/api": {
          origin: new FunctionUrlOrigin(lambdaFunctionUrl),
        },
        "/data": {
          origin: new S3Origin(dataBucket, {
            originAccessIdentity: cloudfrontOriginAccessIdentity,
          }),
        }
      },
    });

    new ARecord(this, "BucketCname", {
      zone: anastaSi,
      recordName: "static-site-experiment",
      target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFrontDistribution))
    });

    new BucketDeployment(this, "DeployStaticSite", {
      sources: [ 
        Source.asset("../website/out"), 
        Source.data(
          "config.js",
          `window.config = ${JSON.stringify({
            userPoolId: userPool.userPoolId,
            userPoolClientId: userPoolClient.userPoolClientId,
            identityPoolId: identityPool.identityPoolId,
            functionName: lambda.functionName,
          })};`
        ),
      ],
      destinationBucket: staticSiteBucket,
      distribution: cloudFrontDistribution,
      distributionPaths:
        find("../website/out", (f: string) => f !== "_next")
          .map((p: string) => p.replace(/^..\/website\/out/, "")),
    });
  }
}

function find(dir: string, filter: (str: string) => boolean): string[] {
  return fs.readdirSync(dir)
    .filter(filter)
    .map(file => path.join(dir, file))
    .flatMap(file => fs.statSync(file).isDirectory() ? find(file, filter) : [ file ]);
}