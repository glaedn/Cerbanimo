import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";

import schema from "./schema";
import Mission from "./models/Mission";
import Signal from "./models/Signal";
import Action from "./models/Action";

const adapter = new SQLiteAdapter({
  schema,
  dbName: "cerbanimoOffline",
  jsi: true,
  onSetUpError: (error) => {
    console.error("WatermelonDB setup failed", error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [
    Mission,
    Signal,
    Action
  ]
});
