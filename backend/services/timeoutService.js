import pool from '../db.js';
import taskController from '../controllers/taskController.js';

const checkTimeouts = async (io) => {
    console.log('Checking for task timeouts...');
    const client = await pool.connect();
    try {
        // Handle peer review timeouts
        const peerReviewTimeoutQuery = `
            SELECT id, project_id FROM tasks
            WHERE status = 'submitted' AND peer_review_deadline < NOW()
        `;
        const peerReviewTimedOutTasksResult = await client.query(peerReviewTimeoutQuery);
        const peerReviewTimedOutTasks = peerReviewTimedOutTasksResult.rows;

        if (peerReviewTimedOutTasks.length > 0) {
            await client.query('BEGIN');
            for (const task of peerReviewTimedOutTasks) {
                console.log(`Peer review for task ${task.id} has timed out. Moving to PM approval.`);
                await client.query(
                    `UPDATE tasks
                     SET status = 'awaiting_pm_approval',
                         pm_approval_deadline = NOW() + INTERVAL '18 hours'
                     WHERE id = $1`,
                    [task.id]
                );

                const projectOwnerQuery = await client.query(
                    `SELECT creator_id FROM projects WHERE id = $1`,
                    [task.project_id]
                );
                const projectOwnerId = projectOwnerQuery.rows[0].creator_id;

                if (projectOwnerId) {
                    const notificationMessage = `Peer review for a task in your project has timed out. The task is now awaiting your approval.`;
                    const notificationDetails = JSON.stringify({
                        text: notificationMessage,
                        projectId: task.project_id,
                        taskId: task.id,
                    });
                    await client.query(
                        `INSERT INTO notifications (user_id, message, type, created_at, read)
                         VALUES ($1, $2, $3, NOW(), false)`,
                        [projectOwnerId, notificationDetails, "task"]
                    );
                    if (io) {
                        io.to(`user_${projectOwnerId}`).emit("notification", {
                            message: notificationMessage,
                            type: "task",
                            projectId: task.project_id,
                            taskId: task.id,
                        });
                    }
                }
            }
            await client.query('COMMIT');
        }

        // Handle PM approval timeouts
        const pmApprovalTimeoutQuery = `
            SELECT id FROM tasks
            WHERE status = 'awaiting_pm_approval' AND pm_approval_deadline < NOW()
        `;
        const pmApprovalTimedOutTasksResult = await client.query(pmApprovalTimeoutQuery);
        const pmApprovalTimedOutTasks = pmApprovalTimedOutTasksResult.rows;

        if (pmApprovalTimedOutTasks.length > 0) {
            await client.query('BEGIN');
            const storyNodeCreationPromises = [];

            for (const task of pmApprovalTimedOutTasks) {
                console.log(`PM approval for task ${task.id} has timed out. Auto-approving.`);
                await client.query(`UPDATE tasks SET status = 'completed' WHERE id = $1`, [task.id]);

                const finalizeResult = await taskController.finalizeTask(task.id, client, io);
                if (finalizeResult.error) {
                    console.error(`Error finalizing timed-out task ${task.id}:`, finalizeResult.error);
                } else if (finalizeResult.storyNodeData && finalizeResult.storyNodeData.user_id) {
                    // Collect promises for story node creation to run after the transaction
                    storyNodeCreationPromises.push(
                        fetch(`${process.env.BACKEND_URL}/storyChronicles/story-node`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(finalizeResult.storyNodeData),
                        })
                    );
                }
            }
            await client.query('COMMIT');

            // Await all story node creation fetches
            const results = await Promise.allSettled(storyNodeCreationPromises);
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Error creating story node for timed-out task:`, result.reason);
                } else if (!result.value.ok) {
                    result.value.text().then(errorText => {
                         console.error(`Error response when creating story node for timed-out task: ${result.value.status} ${result.value.statusText}`, errorText);
                    });
                }
            });
        }

    } catch (error) {
        console.error('Error checking for task timeouts:', error);
        if (client) {
            // The transaction might have been started, so try to roll it back
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error rolling back timeout transaction:', rollbackError);
            }
        }
    } finally {
        if (client) {
            client.release();
        }
    }
};

export default {
    checkTimeouts,
};
