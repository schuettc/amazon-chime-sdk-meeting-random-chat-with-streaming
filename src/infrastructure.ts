// import { GraphqlApi } from '@aws-cdk/aws-appsync-alpha';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  RestApi,
  LambdaIntegration,
  EndpointType,
  MethodLoggingLevel,
} from 'aws-cdk-lib/aws-apigateway';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import {
  Role,
  ServicePrincipal,
  PolicyDocument,
  PolicyStatement,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class Infrastructure extends Construct {
  public readonly apiUrl: string;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const meetingsTable = new Table(this, 'meetings', {
      partitionKey: {
        name: 'meetingId',
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'timeToLive',
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const infrastructureRole = new Role(this, 'infrastructureRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ['chimePolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: ['chime:*'],
            }),
          ],
        }),
        ['ivsPolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: ['ivs:CreateChannel', 'ivs:GetStream'],
            }),
          ],
        }),
      },
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    const meetingLambda = new NodejsFunction(this, 'meetingLambda', {
      entry: 'resources/meetingInfo/meetingInfo.js',
      bundling: {
        nodeModules: [
          '@aws-sdk/client-chime-sdk-meetings',
          '@aws-sdk/lib-dynamodb',
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-ivs',
          '@aws-sdk/client-chime-sdk-media-pipelines',
        ],
      },
      runtime: Runtime.NODEJS_16_X,
      architecture: Architecture.ARM_64,
      role: infrastructureRole,
      timeout: Duration.seconds(60),
      environment: {
        MEETINGS_TABLE: meetingsTable.tableName,
        TWITCH_INGEST: 'rtmp://ord02.contribute.live-video.net/app/',
        TWITCH_KEY: 'live_675733637_s8eUGj95qIOI3iQmB849dyTEDwkj1V',
        // GRAPHQL_URL: props.graphqlApi.graphqlUrl,
        // API_KEY: props.graphqlApi.apiKey!,
      },
    });

    meetingsTable.grantReadWriteData(meetingLambda);

    const api = new RestApi(this, 'ChimeSDKMeetingAPI', {
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['OPTIONS', 'POST'],
        allowCredentials: true,
        allowOrigins: ['*'],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
    });

    const join = api.root.addResource('join');
    const end = api.root.addResource('end');
    const stream = api.root.addResource('stream');

    const meetingIntegration = new LambdaIntegration(meetingLambda);

    join.addMethod('POST', meetingIntegration, {});
    end.addMethod('POST', meetingIntegration, {});
    stream.addMethod('POST', meetingIntegration, {});

    this.apiUrl = api.url;
  }
}
