import * as cdk from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

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

    new BucketDeployment(this, "DeployStaticSite", {
      sources: [ Source.asset("../website") ],
      destinationBucket: staticSiteBucket,
      distribution: cloudFrontDistribution,
      distributionPaths: [ "/index.html" ],
    });
  }
}
