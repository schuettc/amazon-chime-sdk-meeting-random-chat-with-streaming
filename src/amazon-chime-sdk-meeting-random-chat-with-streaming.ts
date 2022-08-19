import { App } from 'aws-cdk-lib';
import { BackEnd } from './backend';
import { FrontEnd } from './frontend';

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new FrontEnd(app, 'ChimeWStreamingFrontEnd', { env: devEnv });

new BackEnd(app, 'ChimeWStreamingBackEnd', { env: devEnv });
app.synth();
