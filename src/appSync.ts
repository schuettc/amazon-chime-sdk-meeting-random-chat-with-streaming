import {
  GraphqlApi,
  AuthorizationType,
  ObjectType,
  Directive,
  MappingTemplate,
  GraphqlType,
  Field,
  ResolvableField,
} from '@aws-cdk/aws-appsync-alpha';

import { Construct } from 'constructs';
export class AppSync extends Construct {
  public graphqlApi: GraphqlApi;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.graphqlApi = new GraphqlApi(this, 'Api', {
      name: 'WS-API',
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.API_KEY,
        },
      },
    });

    const channel = new ObjectType('Channel', {
      definition: {
        name: GraphqlType.string({ isRequired: true }),
        data: GraphqlType.awsJson({ isRequired: true }),
      },
    });

    this.graphqlApi.addType(channel);

    this.graphqlApi.addQuery(
      'getChannel',
      new Field({
        returnType: channel.attribute(),
      }),
    );

    this.graphqlApi.addMutation(
      'publish2channel',
      new ResolvableField({
        returnType: channel.attribute(),
        args: {
          name: GraphqlType.string({ isRequired: true }),
          data: GraphqlType.awsJson({ isRequired: true }),
        },
        dataSource: this.graphqlApi.addNoneDataSource('pubsub'),
        requestMappingTemplate: MappingTemplate.fromString(`
    {
      "version": "2017-02-28",
      "payload": {
          "name": "$context.arguments.name",
          "data": $util.toJson($context.arguments.data)
      }
    }`),
        responseMappingTemplate: MappingTemplate.fromString(
          '$util.toJson($context.result)',
        ),
      }),
    );

    this.graphqlApi.addSubscription(
      'subscribe2channel',
      new Field({
        returnType: channel.attribute(),
        args: { name: GraphqlType.string({ isRequired: true }) },
        directives: [Directive.subscribe('publish2channel')],
      }),
    );
  }
}
