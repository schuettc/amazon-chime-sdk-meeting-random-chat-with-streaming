const config = await fetch('./config.json').then((response) => response.json());
// import cdkExports from './cdk-outputs.json';
// const config = cdkExports.ChimeWStreamingBackEnd;

export const AmplifyConfig = {
    API: {
        endpoints: [
            {
                name: 'meetingApi',
                endpoint: config.apiUrl,
            },
        ],
    },
};
