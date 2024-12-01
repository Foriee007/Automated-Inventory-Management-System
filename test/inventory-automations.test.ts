import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {InventoryAutomationsStack} from "../lib/inventory-automations-stack";

// example test. To run these tests, uncomment this file along with the
test('DynamoDB Table Created', () => {
    const app = new cdk.App();
    const stack = new InventoryAutomationsStack(app, 'TestStack');

    const template = Template.fromStack(stack);

    // Assert DynamoDB Table exists
    template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
    });
});
