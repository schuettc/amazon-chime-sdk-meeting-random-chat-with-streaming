import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BackEnd } from '../src/backend';
import { FrontEnd } from '../src/frontend';

test('Snapshot', () => {
  const app = new App();
  const frontEnedStack = new FrontEnd(app, 'FrontEnd');
  const backEndStack = new BackEnd(app, 'BackEnd');

  const frontEndTemplate = Template.fromStack(frontEnedStack);
  expect(frontEndTemplate.toJSON()).toMatchSnapshot();

  const backEndTemplate = Template.fromStack(backEndStack);
  expect(backEndTemplate.toJSON()).toMatchSnapshot();
});
