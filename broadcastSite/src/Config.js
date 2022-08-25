const config = await fetch('./config.json').then((response) => response.json());

export const AmplifyConfig = {
    aws_appsync_graphqlEndpoint: config.graphqlUrl,
    aws_appsync_region: config.region,
    aws_appsync_authenticationType: 'API_KEY',
    aws_appsync_apiKey: config.apiKey,
};
