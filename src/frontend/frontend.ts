import { execSync, ExecSyncOptions } from 'child_process';
import {
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps,
  DockerImage,
  Fn,
} from 'aws-cdk-lib';
import {
  Distribution,
  SecurityPolicyProtocol,
  CachePolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Source, BucketDeployment } from 'aws-cdk-lib/aws-s3-deployment';
import {
  AwsCustomResource,
  PhysicalResourceId,
  AwsCustomResourcePolicy,
} from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { copySync } from 'fs-extra';

export class FrontEnd extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const siteBucket = new Bucket(this, 'websiteBucket', {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new Distribution(this, 'CloudfrontDistribution', {
      enableLogging: true,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: new S3Origin(siteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_DISABLED,
      },
      defaultRootObject: 'index.html',
    });
    const execOptions: ExecSyncOptions = { stdio: 'inherit' };

    const bundle = Source.asset('./site', {
      bundling: {
        command: [
          'sh',
          '-c',
          'echo "Docker build not supported. Please install esbuild."',
        ],
        image: DockerImage.fromRegistry('alpine'),
        local: {
          tryBundle(outputDir: string) {
            try {
              execSync('esbuild --version', execOptions);
            } catch {
              /* istanbul ignore next */
              return false;
            }
            execSync(
              'cd site && yarn install --frozen-lockfile && yarn build',
              execOptions,
            );
            copySync('./site/dist', outputDir, {
              ...execOptions,
              recursive: true,
            });
            return true;
          },
        },
      },
    });

    const importedApiUrl = Fn.importValue('randomChatWithStreamingApiUrl');

    const configData = {
      apiUrl: importedApiUrl,
    };

    new BucketDeployment(this, 'DeployBucket', {
      sources: [bundle],
      destinationBucket: siteBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
      prune: false,
    });

    new AwsCustomResource(this, 'ConfigFrontEnd', {
      onUpdate: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Body: JSON.stringify(configData),
          Bucket: siteBucket.bucketName,
          Key: 'config.json',
        },
        physicalResourceId: PhysicalResourceId.of(Date.now().toString()),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    new CfnOutput(this, 'distribution', {
      value: distribution.domainName,
    });

    new CfnOutput(this, 'siteBucket', { value: siteBucket.bucketName });
  }
}
