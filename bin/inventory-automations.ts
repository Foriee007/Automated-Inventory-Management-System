#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InventoryAutomationsStack } from '../lib/inventory-automations-stack';

const app = new cdk.App();
new InventoryAutomationsStack(app, 'InventoryAutomationsStack', {
  env: { account: '861276083393', region: 'us-east-1' },
});

