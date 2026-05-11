/* eslint-disable */
import { Model } from "@nozbe/watermelondb";
import { field, date, readonly } from "@nozbe/watermelondb/decorators";

export default class Signal extends Model {
  static table = "signals";

  @field("type") type;
  @field("message") message;
  @field("priority") priority;
  @field("location_lat") locationLat;
  @field("location_lon") locationLon;
  @field("remote_id") remoteId;

  @readonly @date("created_at") createdAt;
}
