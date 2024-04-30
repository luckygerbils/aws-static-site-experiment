import * as cdk from 'aws-cdk-lib';
import { Certificate, CertificateValidation, DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnDistribution, CfnOriginAccessControl, Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CanonicalUserPrincipal } from 'aws-cdk-lib/aws-iam';
import { ARecord, CnameRecord, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { BucketWebsiteTarget, CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketAccessControl, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { stat } from 'fs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

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

    new BucketDeployment(this, "DeployStaticSite", {
      sources: [ Source.asset("website") ],
      destinationBucket: staticSiteBucket,
    });

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
        // functionAssociations: [{
        //     function: rewriteFunction,
        //     eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
        // }],
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // responseHeadersPolicy: responseHeaderPolicy
      },
    });

    new ARecord(this, "BucketCname", {
      zone: anastaSi,
      recordName: "static-site-experiment",
      target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFrontDistribution))
    });
  }
}
