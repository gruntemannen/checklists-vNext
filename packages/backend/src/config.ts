export const config = {
  tableName: process.env.TABLE_NAME || 'checklists-vnext-main',
  userPoolId: process.env.USER_POOL_ID || '',
  attachmentsBucket: process.env.ATTACHMENTS_BUCKET || '',
  region: process.env.AWS_REGION || 'eu-north-1',
  nodeEnv: process.env.NODE_ENV || 'development',
};
