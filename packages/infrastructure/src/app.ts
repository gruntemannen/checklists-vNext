#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from './stacks/auth-stack';
import { DatabaseStack } from './stacks/database-stack';
import { StorageStack } from './stacks/storage-stack';
import { ApiStack } from './stacks/api-stack';
import { FrontendStack } from './stacks/frontend-stack';

const app = new cdk.App();

const appName = app.node.tryGetContext('appName') || 'checklists-vnext';
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'eu-north-1',
};

const owner = app.node.tryGetContext('owner') || 'your-org';
const projectTags: Record<string, string> = {
  Project: appName,
  Environment: 'production',
  ManagedBy: 'aws-cdk',
  Owner: owner,
  CostCenter: appName,
};

const auth = new AuthStack(app, `${appName}-auth`, { appName, env });
const database = new DatabaseStack(app, `${appName}-database`, {
  appName,
  env,
});
const storage = new StorageStack(app, `${appName}-storage`, { appName, env });

const api = new ApiStack(app, `${appName}-api`, {
  appName,
  env,
  userPool: auth.userPool,
  table: database.table,
  attachmentsBucket: storage.attachmentsBucket,
});

const domainName = app.node.tryGetContext('domainName');
const hostname = app.node.tryGetContext('hostname');

const frontend = new FrontendStack(app, `${appName}-frontend`, {
  appName,
  env,
  apiUrl: api.apiUrl,
  ...(domainName && { domainName }),
  ...(hostname && { hostname }),
});

for (const stack of [auth, database, storage, api, frontend]) {
  for (const [key, value] of Object.entries(projectTags)) {
    cdk.Tags.of(stack).add(key, value);
  }
}
