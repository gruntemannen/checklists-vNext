import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient } from './client';
import { config } from '../config';

const TableName = config.tableName;

export async function putItem(item: Record<string, unknown>) {
  await docClient.send(new PutCommand({ TableName, Item: item }));
}

export async function getItem(pk: string, sk: string) {
  const result = await docClient.send(
    new GetCommand({ TableName, Key: { PK: pk, SK: sk } }),
  );
  return result.Item;
}

export async function deleteItem(pk: string, sk: string) {
  await docClient.send(
    new DeleteCommand({ TableName, Key: { PK: pk, SK: sk } }),
  );
}

export async function queryByPk(
  pk: string,
  skPrefix?: string,
  options?: { limit?: number; nextToken?: string; indexName?: string },
) {
  const params: Record<string, unknown> = {
    TableName,
    KeyConditionExpression: skPrefix
      ? 'PK = :pk AND begins_with(SK, :sk)'
      : 'PK = :pk',
    ExpressionAttributeValues: skPrefix
      ? { ':pk': pk, ':sk': skPrefix }
      : { ':pk': pk },
  };

  if (options?.indexName) {
    (params as any).IndexName = options.indexName;
    (params as any).KeyConditionExpression = skPrefix
      ? 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)'
      : 'GSI1PK = :pk';
  }
  if (options?.limit) (params as any).Limit = options.limit;
  if (options?.nextToken) {
    (params as any).ExclusiveStartKey = JSON.parse(
      Buffer.from(options.nextToken, 'base64').toString(),
    );
  }

  const result = await docClient.send(new QueryCommand(params as any));
  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return { items: result.Items || [], nextToken };
}

export async function updateItem(
  pk: string,
  sk: string,
  updates: Record<string, unknown>,
) {
  const entries = Object.entries(updates).filter(
    ([_, v]) => v !== undefined,
  );
  if (entries.length === 0) return;

  const expression = entries
    .map(([k], i) => `#k${i} = :v${i}`)
    .join(', ');
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  entries.forEach(([k, v], i) => {
    names[`#k${i}`] = k;
    values[`:v${i}`] = v;
  });

  await docClient.send(
    new UpdateCommand({
      TableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET ${expression}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}
