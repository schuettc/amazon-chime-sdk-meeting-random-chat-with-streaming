import React, { useState, useEffect } from 'react';

import NorthStarThemeProvider from 'aws-northstar/components/NorthStarThemeProvider';
import Header from 'aws-northstar/components/Header';
import { AmplifyConfig as config } from './Config';
import Amplify, { API, graphqlOperation } from 'aws-amplify';
import AmazonIVS from './IVS';
import * as subscriptions from './graphql/subscriptions';
import '@aws-amplify/ui-react/styles.css';

Amplify.configure(config);
Amplify.Logger.LOG_LEVEL = 'DEBUG';

const App = () => {
    const [playbackUrl, setPlaybackUrl] = useState([]);
    let channel = 'robots';
    useEffect(() => {
        const subscription = API.graphql(
            graphqlOperation(subscriptions.subscribe2channel, { name: channel }),
        ).subscribe({
            next: ({ provider, value }) => {
                setPlaybackUrl(value.data.subscribe2channel.data);
            },
            error: (error) => console.warn(error),
        });

        return () => subscription.unsubscribe();
    }, [channel]);

    return (
        <NorthStarThemeProvider>
            <Header title="Amazon Chime SDK Meeting with Live Connector" />
            <div id="stream">
                <div style={{ padding: '1rem', height: '20vh', boxSizing: 'border-box' }}>
                    {playbackUrl.length > 0 && <AmazonIVS playbackUrl={playbackUrl} />}
                </div>
            </div>
        </NorthStarThemeProvider>
    );
};

export default App;
