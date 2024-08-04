import AWS from "aws-sdk";
import express from "express";
import serverless from "serverless-http";

const app = express();
const USERS_TABLE = process.env.USERS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;

const dynamoDBClient = IS_OFFLINE
  ? new AWS.DynamoDB.DocumentClient({
      region: "localhost",
      endpoint: "http://localhost:8000",
    })
  : new AWS.DynamoDB.DocumentClient();

app.use(express.json());

app.get("/users/:userId", async (req, res) => {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const { Item } = await dynamoDBClient.get(params).promise();
    if (Item) {
      const { userId, name, email } = Item;
      return res.json({ userId, name, email });
    } else {
      return res.status(404).json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not retrieve user" });
  }
});

app.post("/users", async (req, res) => {
  const { userId, name, email } = req.body;

  if (!userId || !name || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId,
      name,
      email,
    },
  };

  try {
    await dynamoDBClient.put(params).promise();
    return res.json({ userId, name, email });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not create user" });
  }
});

app.put("/users/:userId", async (req, res) => {
  const { name, email } = req.body;

  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
    UpdateExpression: "set #name = :name, email = :email",
    ExpressionAttributeNames: {
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": name,
      ":email": email,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const { Attributes } = await dynamoDBClient.update(params).promise();
    return res.json(Attributes);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not update user" });
  }
});

app.delete("/users/:userId", async (req, res) => {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    await dynamoDBClient.delete(params).promise();
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not delete user" });
  }
});

app.use((req, res) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

export const handler = serverless(app);
