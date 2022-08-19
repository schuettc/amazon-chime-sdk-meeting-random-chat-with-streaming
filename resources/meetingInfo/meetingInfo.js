import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const marshallOptions = {
  convertEmptyValues: false,
  removeUndefinedValues: true,
  convertClassInstanceToMap: false,
};
const unmarshallOptions = {
  wrapNumbers: false,
};
const translateConfig = { marshallOptions, unmarshallOptions };
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);
var { randomUUID } = require('crypto');
import { IvsClient } from '@aws-sdk/client-ivs';
import { ChimeSDKMediaPipelinesClient } from '@aws-sdk/client-chime-sdk-media-pipelines';
const {
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
} = require('@aws-sdk/client-chime-sdk-meetings');
const ivsClient = new IvsClient({ region: 'us-east-1' });
const chimeSdkMediaPipelineclient = new ChimeSDKMediaPipelinesClient({
  region: 'us-east-1',
});
const chimeSdkMeetings = new ChimeSDKMeetingsClient({
  region: 'us-east-1',
});

var meetingInfoTable = process.env['MEETINGS_TABLE'];

var response = {
  statusCode: 200,
  body: '',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  },
};
var createMeetingCommandInput = {
  ClientRequestToken: '',
  ExternalMeetingId: '',
  MediaRegion: 'us-east-1',
};

var createAttendeeCommandInput = {
  latencyMode: 'NORMAL',
};
var createChannelCommandInput = {};

var createMediaCapturePipelineCommandInput = {
  Sources: [
    {
      SourceType: 'ChimeSdkMeeting',
      ChimeSdkMeetingLiveConnectorConfiguration: {
        Arn: '',
        MuxType: 'AudioWithCompositedVideo',
        CompositedVideo: {
          Layout: 'GridView',
          Resolution: 'FHD',
          GridViewConfiguration: {
            ContentShareLayout: 'Horizontal',
          },
        },
      },
    },
  ],
  Sinks: [
    {
      SinkType: 'RTMP',
      RTMPConfiguration: {
        Url: '',
        AudioChannels: 'Stereo',
        AudioSampleRate: '48000',
      },
    },
  ],
};

exports.handler = async function (event, context) {
  console.info(event);

  if (event.resource == '/stream') {
    let meetingId = JSON.parse(event.body).meetingId;
    const awsAccountId = context.invokedFunctionArn.split(':')[4];
    const createChannelCommand = new ivsClient.CreateChannelCommand(
      createAttendeeCommandInput,
    );

    const createChannelResponse = await ivsClient.send(createChannelCommand);
    createMediaCapturePipelineCommandInput.Sources[0].ChimeSdkMeetingLiveConnectorConfiguration.Arn = `arn:aws:chime::${awsAccountId}:meeting:${meetingId}`;
    createMediaCapturePipelineCommandInput.Sinks[0].RTMPConfiguration.Url =
      'rtmps://' +
      createChannelResponse.channel.ingestEndpoint +
      ':443/app/' +
      createChannelResponse.streamKey.value;
    console.log(JSON.stringify(createMediaCapturePipelineCommandInput));
    const createPipelineCommand =
      new chimeSdkMediaPipelineclient.CreateMediaLiveConnectorPipelineCommand(
        createMediaCapturePipelineCommandInput,
      );
    const createPipelineResponse = await chimeSdkMediaPipelineclient.send(
      createPipelineCommand,
    );
    console.log(createPipelineResponse);
    const getStreamCommand = new ivsClient.getStreamCommand({
      channelArn: createChannelResponse.stream.Arn,
    });

    for (var m = 0; m < 5; m++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const getStreamResponse = await ivsClient.send(getStreamCommand);
        console.log(getStreamResponse);
        break;
      } catch (err) {
        console.log(err);
      }
    }

    response.statusCode = 200;
    response.body = JSON.stringify({
      playbackUrl: createChannelResponse.channel.playbackUrl,
    });
    console.info('streamInfo: ' + JSON.stringify(response));
    return response;
  }

  const currentMeetings = await checkForMeetings();

  for (let meeting of currentMeetings) {
    if (meeting.joinInfo.Attendee.length < 2) {
      console.log('Adding an attendee to an existing meeting');
      console.log(JSON.stringify(meeting.joinInfo));
      const attendeeInfo = await createAttendee(meeting.meetingId);
      console.log(`attendeeInfo: ${JSON.stringify(attendeeInfo)}`);
      meeting.joinInfo.Attendee.push(attendeeInfo.Attendee);
      console.log(JSON.stringify(meeting.joinInfo));
      putMeetingInfo(meeting.joinInfo);

      const responseInfo = {
        Meeting: meeting.joinInfo.Meeting,
        Attendee: attendeeInfo.Attendee,
      };

      response.statusCode = 200;
      response.body = JSON.stringify(responseInfo);
      console.info('joinInfo: ' + JSON.stringify(response));
      return response;
    }
  }

  const meetingInfo = await createMeeting();
  const attendeeInfo = await createAttendee(meetingInfo.Meeting.MeetingId);

  const joinInfo = {
    Meeting: meetingInfo.Meeting,
    Attendee: [attendeeInfo.Attendee],
  };
  await putMeetingInfo(joinInfo);

  const responseInfo = {
    Meeting: meetingInfo.Meeting,
    Attendee: attendeeInfo.Attendee,
  };

  response.statusCode = 200;
  response.body = JSON.stringify(responseInfo);
  console.info('joinInfo: ' + JSON.stringify(response));
  return response;
};
async function createMeeting() {
  console.log('Creating Meeting');
  createMeetingCommandInput.ClientRequestToken = randomUUID();
  createMeetingCommandInput.ExternalMeetingId = randomUUID();
  const meetingInfo = await chimeSdkMeetings.send(
    new CreateMeetingCommand(createMeetingCommandInput),
  );
  console.info(`Meeting Info: ${JSON.stringify(meetingInfo)}`);
  return meetingInfo;
}

async function createAttendee(meetingId) {
  console.log(`Creating Attendee for Meeting: ${meetingId}`);
  createAttendeeCommandInput.MeetingId = meetingId;
  createAttendeeCommandInput.ExternalUserId = randomUUID();
  const attendeeInfo = await chimeSdkMeetings.send(
    new CreateAttendeeCommand(createAttendeeCommandInput),
  );
  return attendeeInfo;
}
async function putMeetingInfo(joinInfo) {
  var timeToLive = new Date();
  timeToLive.setMinutes(timeToLive.getMinutes() + 5);
  const putMeetingInfoInput = {
    TableName: meetingInfoTable,
    Item: {
      meetingId: joinInfo.Meeting.MeetingId,
      joinInfo,
      timeToLive: timeToLive.getTime() / 1e3,
    },
  };
  console.log(`info to put: ${JSON.stringify(putMeetingInfoInput)}`);
  try {
    const data = await ddbDocClient.send(new PutCommand(putMeetingInfoInput));
    console.log('Success - item added or updated', data);
    return data;
  } catch (err) {
    console.log('Error', err);
  }
}
async function checkForMeetings() {
  const scanMeetingInfo = {
    TableName: meetingInfoTable,
    FilterExpression: 'timeToLive >= :currentEpoch',
    ExpressionAttributeValues: {
      ':currentEpoch': Date.now() / 1e3,
    },
  };
  try {
    const data = await ddbDocClient.send(new ScanCommand(scanMeetingInfo));
    console.log(data);
    return data.Items;
  } catch (err) {
    console.log('Error', err);
  }
}
