import { DynamoDBClient, ScanCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";


const dbClient = new DynamoDBClient({});
const snsClient = new SNSClient({  });
const tableName = process.env.TABLE_NAME!;
const topicArn = process.env.TOPIC_ARN!;

export const handler = async () => {
    // Scan all items in the table
    const scanCommand = new ScanCommand({ TableName: tableName });
    const result = await dbClient.send(scanCommand);

    const items = result.Items?.map((item) => unmarshall(item)) || [];
    const itemCount = items.length;

    // If threshold reached, send notification and delete 10 items
    if (itemCount >= 10) {
        const notificationCommand = new PublishCommand({
            TopicArn: topicArn,
            Message: `Threshold reached: ${itemCount} items in inventory.`,
        });
        await snsClient.send(notificationCommand);

        const itemsToDelete = items.slice(0, 10);
        for (const item of itemsToDelete) {
            const deleteCommand = new DeleteItemCommand({
                TableName: tableName,
                Key: { productId: { S: item.productId } },
            });
            await dbClient.send(deleteCommand);
        }

        console.log("Removed 10 items from inventory.");
    }
};