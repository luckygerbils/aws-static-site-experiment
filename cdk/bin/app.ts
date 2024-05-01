#!/usr/bin/env node
import 'source-map-support/register';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { App, Stack, Stage } from 'aws-cdk-lib';
import { StaticSiteStack } from '../lib/stacks/static-site';
import { nonNull } from "../lib/util";

const env = {
  account: nonNull(process.env.CDK_DEFAULT_ACCOUNT!, "CDK_DEFAULT_ACCOUNT is null"),
  region: "us-west-2",
};
const app = new App();
const pipelineStack = new Stack(app, "PipelineStack", { env });
const pipeline = new CodePipeline(pipelineStack, 'Pipeline', {
  pipelineName: 'AwsStaticSitePipeline',
  synth: new ShellStep('Synth', {
    input: CodePipelineSource.gitHub('luckygerbils/aws-static-site-experiment', 'main'),
    commands: ['./run.sh ci:synth'],
    primaryOutputDirectory: "cdk/cdk.out"
  })
});

const staticSiteStage = new Stage(pipelineStack, "StaticSiteStage", { env });
new StaticSiteStack(staticSiteStage);

pipeline.addStage(staticSiteStage);
