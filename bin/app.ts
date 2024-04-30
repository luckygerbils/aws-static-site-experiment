#!/usr/bin/env node
import 'source-map-support/register';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { App, Stack, Stage } from 'aws-cdk-lib';
import { StaticSiteStack } from '../lib/stacks/static-site';

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: "us-west-2",
};
const app = new App();
const pipelineStack = new Stack(app, "PipelineStack", { env });
const pipeline = new CodePipeline(pipelineStack, 'Pipeline', {
  pipelineName: 'AwsStaticSitePipeline',
  synth: new ShellStep('Synth', {
    input: CodePipelineSource.gitHub('luckygerbils/aws-static-site-experiment', 'main'),
    commands: ['npm ci', 'npx cdk synth']
  })
});

const staticSiteStage = new Stage(pipelineStack, "StaticSiteStage", { env });
new StaticSiteStack(staticSiteStage);

pipeline.addStage(staticSiteStage);
