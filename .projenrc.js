const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.37.1',
  defaultReleaseBranch: 'main',
  name: 'amazon-chime-sdk-meeting-random-chat-with-streaming',
  deps: ['fs-extra', '@types/fs-extra'],
  appEntrypoint: 'amazon-chime-sdk-meeting-random-chat-with-streaming.ts',
  devDeps: ['esbuild'],
  deps: ['cdk-amazon-chime-resources', 'fs-extra', '@types/fs-extra'],
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['schuettc'],
  },
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
    },
  },
  scripts: {
    launch:
      'yarn && yarn projen && yarn build && yarn cdk bootstrap && yarn cdk deploy ChimeWStreamingBackEnd && yarn cdk deploy ChimeWStreamingFrontEnd && yarn configLocal',
  },
});

const common_exclude = [
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
  'dependabot.yml',
  '*.drawio',
  '.DS_Store',
];

project.addTask('getBucket', {
  exec: "aws cloudformation describe-stacks --stack-name ChimeWStreamingFrontEnd --query 'Stacks[0].Outputs[?OutputKey==`siteBucket`].OutputValue' --output text",
});

project.addTask('configLocal', {
  exec: 'aws s3 cp s3://$(yarn run --silent getBucket)/config.json site/public/',
});

project.gitignore.exclude(...common_exclude);
project.synth();
