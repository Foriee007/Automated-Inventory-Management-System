import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import {v4} from "uuid";

const dynamoDBClient = new DynamoDBClient({ });
const tableName = process.env.TABLE_NAME!;

export const handler = async () => {
    const item = {
        productId: v4(),
        shortDescription: "in stock Item",
        tag: "clothes",    // To Do.... add logic for different tag name if requires
        cost: Math.floor(Math.random() * 50) + 1,
    };

    const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall(item), // util tool to Convert JavaScript object into DynamoDB Record
    });

    await dynamoDBClient.send(command);
    console.log("Item inserted:", item);
};