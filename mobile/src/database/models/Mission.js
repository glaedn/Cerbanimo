/* eslint-disable */
import { Model } from "@nozbe/watermelondb";
import { field, date, readonly } from "@nozbe/watermelondb/decorators";

export default class Mission extends Model {
  static table = "missions";

  @field("title") title;
  @field("description") description;
  @field("status") status;
  @field("category") category;
  @field("urgency") urgency;
  @field("location_lat") locationLat;
  @field("location_lon") locationLon;
  @field("remote_id") remoteId;

  @readonly @date("created_at") createdAt;
  @readonly @date("updated_at") updatedAt;
}
