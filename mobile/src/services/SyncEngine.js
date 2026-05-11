import { database } from "../database";
import { Q } from "@nozbe/watermelondb";

export class SyncEngine {
  constructor(api) {
    this.api = api;
    this.isSyncing = false;
  }

  async sync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log("[SyncEngine] Starting sync...");

    try {
      await this.pushChanges();
      await this.pullChanges();
      console.log("[SyncEngine] Sync complete.");
    } catch (error) {
      console.error("[SyncEngine] Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  async pushChanges() {
    const actionsCollection = database.get("actions");
    const pendingActions = await actionsCollection.query(Q.where("status", "pending")).fetch();

    for (const action of pendingActions) {
      try {
        const payload = JSON.parse(action.payload);
        await this.processAction(action.type, payload);

        await database.write(async () => {
          await action.update((record) => {
            record.status = "synced";
          });
        });
      } catch (error) {
        console.error(`[SyncEngine] Failed to push action ${action.id}:`, error);
        await database.write(async () => {
          await action.update((record) => {
            record.status = "failed";
            record.error = error.message;
          });
        });
      }
    }
  }

  async processAction(type, payload) {
    switch (type) {
      case "MISSION_ACCEPT":
        return this.api.put(`/tasks/${payload.missionId}/accept`, { userId: payload.userId });
      case "MISSION_UPDATE_STATUS":
        return this.api.put(`/tasks/${payload.missionId}/status`, { status: payload.status, userId: payload.userId });
      case "MISSION_SUBMIT":
        return this.api.post(`/tasks/${payload.missionId}/submit`, payload);
      case "VERIFICATION_UPLOAD":
        return this.api.post("/verification/upload", payload);
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  async pullChanges() {
    try {
      const remoteMissions = await this.api.get("/tasks/accepted");
      await this.reconcileMissions(remoteMissions);
    } catch (error) {
      console.warn("[SyncEngine] Could not pull missions:", error);
    }

    try {
      const remoteNeeds = await this.api.get("/needs");
      await this.reconcileSignals(remoteNeeds);
    } catch (error) {
      console.warn("[SyncEngine] Could not pull signals:", error);
    }
  }

  async reconcileMissions(remoteMissions) {
    const missionsCollection = database.get("missions");

    await database.write(async () => {
      for (const remote of remoteMissions) {
        const local = await missionsCollection.query(Q.where("remote_id", String(remote.id))).fetch();

        if (local.length > 0) {
          await local[0].update((record) => {
            record.title = remote.name;
            record.description = remote.description;
            record.status = remote.status;
            record.urgency = remote.urgency || "normal";
          });
        } else {
          await missionsCollection.create((record) => {
            record.remoteId = String(remote.id);
            record.title = remote.name;
            record.description = remote.description;
            record.status = remote.status;
            record.urgency = remote.urgency || "normal";
          });
        }
      }
    });
  }

  async reconcileSignals(remoteNeeds) {
    const signalsCollection = database.get("signals");

    await database.write(async () => {
      for (const remote of remoteNeeds) {
        const local = await signalsCollection.query(Q.where("remote_id", String(remote.id))).fetch();

        if (local.length === 0) {
          await signalsCollection.create((record) => {
            record.remoteId = String(remote.id);
            record.type = "NEED";
            record.message = remote.name;
            record.priority = remote.urgency_level || 1;
            record.locationLat = remote.latitude;
            record.locationLon = remote.longitude;
          });
        }
      }
    });
  }

  async enqueueAction(type, payload) {
    const actionsCollection = database.get("actions");
    await database.write(async () => {
      await actionsCollection.create((record) => {
        record.type = type;
        record.payload = JSON.stringify(payload);
        record.status = "pending";
      });
    });

    this.sync();
  }
}
