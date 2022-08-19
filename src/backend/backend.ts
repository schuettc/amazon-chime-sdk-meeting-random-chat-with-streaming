import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Infrastructure } from './';

export class BackEnd extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const infrastructure = new Infrastructure(this, 'infrastructure');
    new CfnOutput(this, 'apiUrl', {
      value: infrastructure.apiUrl,
      exportName: 'randomChatWithStreamingApiUrl',
    });
  }
}
