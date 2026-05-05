import { autoGenerateTasks } from './taskGenerator.js';

export async function generateTasksFromNeed(need) {
  return autoGenerateTasks(
    need.name,
    need.description,
    need.category || 'Coordination',
    need.requestor_user_id || need.requestor_community_id,
    need.required_before_date,
    `Fulfill need: ${need.name}`,
    'need_fulfillment'
  );
}
