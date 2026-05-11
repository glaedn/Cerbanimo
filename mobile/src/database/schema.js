import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "missions",
      columns: [
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "status", type: "string" },
        { name: "category", type: "string", isOptional: true },
        { name: "urgency", type: "string" },
        { name: "location_lat", type: "number", isOptional: true },
        { name: "location_lon", type: "number", isOptional: true },
        { name: "remote_id", type: "string", isIndexed: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" }
      ]
    }),
    tableSchema({
      name: "signals",
      columns: [
        { name: "type", type: "string" },
        { name: "message", type: "string" },
        { name: "priority", type: "number" },
        { name: "location_lat", type: "number", isOptional: true },
        { name: "location_lon", type: "number", isOptional: true },
        { name: "remote_id", type: "string", isIndexed: true },
        { name: "created_at", type: "number" }
      ]
    }),
    tableSchema({
      name: "actions",
      columns: [
        { name: "type", type: "string" },
        { name: "payload", type: "string" }, // JSON stringified
        { name: "status", type: "string" }, // 'pending', 'synced', 'failed'
        { name: "error", type: "string", isOptional: true },
        { name: "created_at", type: "number" }
      ]
    })
  ]
});
