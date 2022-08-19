import React, { useState, useEffect } from 'react';
import {
    useMeetingManager,
    useLocalVideo,
    ControlBar,
    ControlBarButton,
    Cell,
    Meeting,
    LeaveMeeting,
    LocalVideo,
    Play,
    AudioInputControl,
    RemoteVideo,
    DeviceLabels,
    VideoGrid,
    VideoInputControl,
    AudioOutputControl,
    MeetingStatus,
    useDeviceLabelTriggerStatus,
    useRemoteVideoTileState,
    useMeetingStatus,
} from 'amazon-chime-sdk-component-library-react';
import { MeetingSessionConfiguration } from 'amazon-chime-sdk-js';
import NorthStarThemeProvider from 'aws-northstar/components/NorthStarThemeProvider';
import Header from 'aws-northstar/components/Header';
import './App.css';
import { AmplifyConfig as config } from './Config';
import { Amplify, API } from 'aws-amplify';
import AmazonIVS from './IVS';
import '@aws-amplify/ui-react/styles.css';
Amplify.configure(config);
Amplify.Logger.LOG_LEVEL = 'DEBUG';
console.log(config.API);
const App = () => {
    const meetingManager = useMeetingManager();
    const status = useDeviceLabelTriggerStatus();
    const meetingStatus = useMeetingStatus();
    const [meetingId, setMeetingId] = useState('');
    const [attendeeId, setAttendeeId] = useState('');
    const [playbackUrl, setPlaybackUrl] = useState('');

    const { tileId, isVideoEnabled, hasReachedVideoLimit, toggleVideo } = useLocalVideo();
    const { tiles } = useRemoteVideoTileState();
    const [remoteTileId, setRemoteTileId] = useState('');

    useEffect(() => {
        if (tiles && tiles.length) {
            setRemoteTileId(tiles[0]);
        } else {
            setRemoteTileId(undefined);
        }
    }, [tiles]);

    useEffect(() => {
        async function tog() {
            if (meetingStatus === MeetingStatus.Succeeded) {
                await toggleVideo();
            }
        }
        tog();
    }, [meetingStatus]);

    const JoinButtonProps = {
        icon: <Meeting />,
        onClick: (event) => handleJoin(event),
        label: 'Join',
    };

    const LeaveButtonProps = {
        icon: <LeaveMeeting />,
        onClick: (event) => toggleVideo(event),
        label: 'Leave',
    };

    const StreamButtonProps = {
        icon: <Play />,
        onClick: (event) => handleStream(event),
        // onClick: (event) => {
        //     setPlaybackUrl(
        //         'https://fcc3ddae59ed.us-west-2.playback.live-video.net/api/video/v1/us-west-2.893648527354.channel.DmumNckWFTqz.m3u8',
        //     );
        //     console.log(playbackUrl);
        // },
        label: 'Stream',
    };

    const handleStream = async (event) => {
        event.preventDefault();
        const streamResponse = await API.post('meetingApi', 'stream', {
            body: {
                meetingId: meetingId,
            },
        });

        console.log(streamResponse);
        setPlaybackUrl(streamResponse.playbackUrl);
    };

    const handleJoin = async (event) => {
        event.preventDefault();
        try {
            const joinResponse = await API.post('meetingApi', 'join', {});
            console.log(joinResponse);
            const meetingSessionConfiguration = new MeetingSessionConfiguration(
                joinResponse.Meeting,
                joinResponse.Attendee,
            );

            const options = {
                deviceLabels: DeviceLabels.Video,
            };

            await meetingManager.join(meetingSessionConfiguration, options);
            await meetingManager.start();
            meetingManager.invokeDeviceProvider(DeviceLabels.AudioAndVideo);
            console.log('Meeting started');
            setMeetingId(joinResponse.Meeting.MeetingId);
            setAttendeeId(joinResponse.Attendee.AttendeeId);
            console.log(meetingId);
            console.log(attendeeId);
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <NorthStarThemeProvider>
            <Header title="Amazon Chime SDK Meeting Random Chat with Streaming" />

            <div id="video">
                <div style={{ padding: '1rem', height: '35vh', boxSizing: 'border-box' }}>
                    <VideoGrid size={2}>
                        <LocalVideo
                            nameplate="Me"
                            style={{
                                border: '1px solid grey',
                                gridArea: '',
                            }}
                            key={1}
                        />
                        <RemoteVideo
                            tileId={remoteTileId}
                            nameplate="Remote"
                            style={{
                                border: '1px solid grey',
                                gridArea: '',
                            }}
                            key={0}
                        />
                    </VideoGrid>
                </div>
            </div>
            <ControlBar showLabels={true} responsive={true} layout="undocked-horizontal" css="margin: 10px">
                <Cell gridArea="button">
                    <ControlBarButton {...JoinButtonProps} />
                </Cell>
                <Cell gridArea="button">
                    <ControlBarButton {...LeaveButtonProps} />
                </Cell>
                <Cell gridArea="button">
                    <ControlBarButton {...StreamButtonProps} />
                </Cell>
                <Cell gridArea="button">
                    <AudioInputControl />
                </Cell>
                <Cell gridArea="button">
                    <AudioOutputControl />
                </Cell>
                <Cell gridArea="button">
                    <VideoInputControl />
                </Cell>
            </ControlBar>
            <div id="stream">
                <div style={{ padding: '1rem', height: '20vh', boxSizing: 'border-box' }}>
                    {playbackUrl.length > 0 && <AmazonIVS playbackUrl={playbackUrl} />}
                </div>
            </div>
        </NorthStarThemeProvider>
    );
};

export default App;
