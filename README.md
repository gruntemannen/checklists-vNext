# Checklists vNext

A Checklist SaaS application built with React, Node.js, DynamoDB, and AWS CDK.

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query
- **Backend**: Express.js API running on AWS Lambda via `@vendia/serverless-express`
- **Auth**: AWS Cognito (admin-invited users, email-based login)
- **Database**: DynamoDB (single-table design)
- **Storage**: S3 for checklist attachments (presigned URL uploads)
- **Infrastructure**: AWS CDK (TypeScript)
- **Hosting**: S3 + CloudFront

## Project Structure

```
packages/
  shared/           # Shared TypeScript types, constants, validation schemas
  backend/          # Express API + Lambda handler
  frontend/         # React + Vite application
  infrastructure/   # AWS CDK stacks
```

## Prerequisites

- Node.js >= 20
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

## Setup

```bash
# Install all dependencies
npm install

# Build shared types (required before other packages)
npm run build:shared

# Copy and configure environment
cp .env.example .env
```

## Development

```bash
# Start frontend dev server (port 3000)
npm run dev:frontend

# Start backend dev server (port 4000)
npm run dev:backend
```

## Deploy

```bash
# Build all packages
npm run build

# Deploy all CDK stacks
npm run cdk -- deploy --all
```

## Key Features

- **Admin user management**: Invite users, edit permissions, manage access periods
- **Team organization**: Create teams, set managers, control visibility
- **Checklist templates**: Reusable templates with predefined items
- **Recurring checklists**: Auto-create from templates on schedule
- **Approval workflows**: Submit checklists for review, approve/reject
- **File attachments**: Upload files to checklist items via presigned URLs
- **Due date tracking**: Dashboard shows overdue and upcoming items
