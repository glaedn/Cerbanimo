import TaskRoutingService from './services/TaskRoutingService.js';
import pool from './db.js';

async function test() {
    console.log("Testing with non-existent user ID...");
    try {
        // We use a high ID that likely doesn't exist
        const missions = await TaskRoutingService.getMatchingTasksForUser(999999);
        console.log("Missions for non-existent user:", missions);
        if (Array.isArray(missions) && missions.length === 0) {
            console.log("SUCCESS: Returned empty array for non-existent user.");
        } else {
            console.log("FAILURE: Did not return empty array.");
        }
    } catch (err) {
        console.error("FAILURE: Threw error for non-existent user:", err);
    }

    // We don't necessarily need to test with a valid user if we can't easily find one in this environment
    // but the fix was specifically for the 500 error on missing user.

    pool.end();
}

test();
