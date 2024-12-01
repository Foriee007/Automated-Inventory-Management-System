import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const  dynamoDBClient= new DynamoDBClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: any) => {
    const { productId } = JSON.parse(event.body);
    console.log(event);

    const command = new GetItemCommand({
        TableName: tableName,
        Key: { productId: { S: productId } },
    });

    const result = await dynamoDBClient.send(command);
    const item = result.Item ? unmarshall(result.Item) : null;

    return {
        statusCode: 200,
        body: JSON.stringify({ item }),
    };
};