import { MongoClient, ObjectId } from "npm:mongodb@6.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MONGO_URL = "mongodb+srv://user:user@cluster0.oykf1kf.mongodb.net/bolt";

let cachedClient: MongoClient | null = null;

async function getMongoClient() {
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = new MongoClient(MONGO_URL);
  await cachedClient.connect();
  return cachedClient;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const client = await getMongoClient();
    const db = client.db("bolt");
    const todos = db.collection("todos");

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === "GET" && path.endsWith("/todos")) {
      const allTodos = await todos.find({}).toArray();
      return new Response(JSON.stringify(allTodos), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (method === "POST" && path.endsWith("/todos")) {
      const body = await req.json();
      const newTodo = {
        text: body.text,
        completed: false,
        createdAt: new Date(),
      };
      const result = await todos.insertOne(newTodo);
      return new Response(
        JSON.stringify({ _id: result.insertedId, ...newTodo }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (method === "PUT" && path.includes("/todos/")) {
      const id = path.split("/").pop();
      const body = await req.json();
      await todos.updateOne(
        { _id: new ObjectId(id) },
        { $set: { completed: body.completed } }
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (method === "DELETE" && path.includes("/todos/")) {
      const id = path.split("/").pop();
      await todos.deleteOne({ _id: new ObjectId(id) });
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});