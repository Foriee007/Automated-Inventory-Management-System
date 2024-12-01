
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Alarm, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";


export class InventoryAutomationsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const inventoryTable = new Table(this, 'InventoryTable', {
      partitionKey: { name: 'productId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // DynamoDB Secondary Index for querying by tag
    inventoryTable.addGlobalSecondaryIndex({
      indexName: 'TagIndex',
      partitionKey: { name: 'tag', type: AttributeType.STRING },
    });

    // SNS Topic for notifications
    const notificationTopic = new Topic(this, 'InventoryNotificationTopic');
    notificationTopic.addSubscription(new EmailSubscription('fori.enchve@gmail.com'));

    // Lambda for periodic item insertion
    const insertItemLambda = new NodejsFunction(this, 'InsertItemLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../src/functions/add-inventories.ts`,
      handler: 'handler',
      environment: {
        TABLE_NAME: inventoryTable.tableName,
      },
    });
    inventoryTable.grantWriteData(insertItemLambda);

    // EventBridge Rule for scheduling
    new Rule(this, 'PeriodicInsertionRule', {
      schedule: Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new LambdaFunction(insertItemLambda)],
    });

    // Lambda for API queries
    const queryItemLambda = new NodejsFunction(this, 'QueryItemLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../src/functions/query-item.ts`,
      handler: 'handler',
      environment: {
        TABLE_NAME: inventoryTable.tableName,
      },
    });
    inventoryTable.grantReadData(queryItemLambda);

    // API Gateway
    const api = new RestApi(this, 'InventoryApi');
    const itemResource = api.root.addResource('item');
    itemResource.addMethod('POST', new LambdaIntegration(queryItemLambda));

    // Lambda for monitoring and cleanup
    const monitorLambda = new NodejsFunction(this, 'MonitorLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../src/functions/monitoring-item.ts`,
      handler: 'handler',
      environment: {
        TABLE_NAME: inventoryTable.tableName,
        TOPIC_ARN: notificationTopic.topicArn,
      },
    });
    inventoryTable.grantReadWriteData(monitorLambda);
    notificationTopic.grantPublish(monitorLambda);

    // CloudWatch Alarm
    const itemCountMetric = new Metric({
      namespace: 'AWS/DynamoDB',
      metricName: 'ItemCount',
      dimensionsMap: {
        TableName: inventoryTable.tableName,
      },
    });

    const itemCountAlarm = new Alarm(this, 'ItemCountAlarm', {
      metric: itemCountMetric,
      threshold: 10,
      evaluationPeriods: 1,
    });
    // Add an SNS action for the alarm
    itemCountAlarm.addAlarmAction(new SnsAction(notificationTopic));
  }
}


