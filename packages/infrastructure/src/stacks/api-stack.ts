import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  appName: string;
  userPool: cognito.UserPool;
  table: dynamodb.Table;
  attachmentsBucket: s3.Bucket;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const apiHandler = new NodejsFunction(this, 'ApiHandler', {
      functionName: `${props.appName}-api`,
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../backend/src/lambda.ts'),
      handler: 'handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        format: cdk.aws_lambda_nodejs.OutputFormat.CJS,
        externalModules: [],
      },
      environment: {
        TABLE_NAME: props.table.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        ATTACHMENTS_BUCKET: props.attachmentsBucket.bucketName,
        NODE_ENV: 'production',
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    props.table.grantReadWriteData(apiHandler);
    props.attachmentsBucket.grantReadWrite(apiHandler);
    props.userPool.grant(
      apiHandler,
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminDeleteUser',
      'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:AdminDisableUser',
      'cognito-idp:AdminEnableUser',
      'cognito-idp:AdminGetUser',
      'cognito-idp:ListUsers',
    );

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${props.appName}-api`,
      deployOptions: { stageName: 'api' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
        ],
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'CognitoAuthorizer',
      { cognitoUserPools: [props.userPool] },
    );

    const corsResponseHeaders: Record<string, string> = {
      'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
      'gatewayresponse.header.Access-Control-Allow-Headers':
        "'Content-Type,Authorization,X-Amz-Date,X-Api-Key'",
      'gatewayresponse.header.Access-Control-Allow-Methods':
        "'GET,POST,PUT,PATCH,DELETE,OPTIONS'",
    };

    api.addGatewayResponse('Default4xx', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: corsResponseHeaders,
    });

    api.addGatewayResponse('Default5xx', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: corsResponseHeaders,
    });

    api.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(apiHandler),
      defaultMethodOptions: {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
      anyMethod: true,
    });

    this.apiUrl = api.url;

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
  }
}
