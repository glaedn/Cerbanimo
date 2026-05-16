/* eslint-disable */
import { Model } from "@nozbe/watermelondb";
import { field, date, readonly } from "@nozbe/watermelondb/decorators";

export default class Action extends Model {
  static table = "actions";

  @field("type") type;
  @field("payload") payload;
  @field("status") status;
  @field("error") error;

  @readonly @date("created_at") createdAt;
}
