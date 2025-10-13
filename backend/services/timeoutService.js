import pool from '../db.js';
import petalController from '../controllers/petalController.js';

const checkTimeouts = async (io) => {
    console.log('Checking for petal timeouts...');
    const client = await pool.connect();
    try {
        // Handle peer review timeouts
        const peerReviewTimeoutQuery = `
            SELECT id, project_id FROM petals
            WHERE status = 'submitted' AND array_length(approvals, 1) IS NULL AND peer_review_deadline < NOW()
        `;
        const peerReviewTimedOutPetalsResult = await client.query(peerReviewTimeoutQuery);
        const peerReviewTimedOutPetals = peerReviewTimedOutPetalsResult.rows;

        if (peerReviewTimedOutPetals.length > 0) {
            await client.query('BEGIN');
            for (const petal of peerReviewTimedOutPetals) {
                console.log(`Peer review for petal ${petal.id} has timed out. Moving to PM approval.`);
                await client.query(
                    `UPDATE petals
                     SET pm_approval_deadline = NOW() + INTERVAL '18 hours'
                     WHERE id = $1`,
                    [petal.id]
                );

                const projectOwnerQuery = await client.query(
                    `SELECT creator_id FROM projects WHERE id = $1`,
                    [petal.project_id]
                );
                const projectOwnerId = projectOwnerQuery.rows[0].creator_id;

                if (projectOwnerId) {
                    const notificationMessage = `Peer review for a petal in your project has timed out. The petal is now awaiting your approval.`;
                    const notificationDetails = JSON.stringify({
                        text: notificationMessage,
                        projectId: petal.project_id,
                        petalId: petal.id,
                    });
                    await client.query(
                        `INSERT INTO notifications (user_id, message, type, created_at, read)
                         VALUES ($1, $2, $3, NOW(), false)`,
                        [projectOwnerId, notificationDetails, "petal"]
                    );
                    if (io) {
                        io.to(`user_${projectOwnerId}`).emit("notification", {
                            message: notificationMessage,
                            type: "petal",
                            projectId: petal.project_id,
                            petalId: petal.id,
                        });
                    }
                }
            }
            await client.query('COMMIT');
        }

        // Handle PM approval timeouts
        const pmApprovalTimeoutQuery = `
            SELECT id FROM petals
            WHERE status = 'submitted' AND array_length(approvals, 1) >= 2 AND pm_approval_deadline < NOW()
        `;
        const pmApprovalTimedOutPetalsResult = await client.query(pmApprovalTimeoutQuery);
        const pmApprovalTimedOutPetals = pmApprovalTimedOutPetalsResult.rows;

        if (pmApprovalTimedOutPetals.length > 0) {
            await client.query('BEGIN');
            const storyNodeCreationPromises = [];

            for (const petal of pmApprovalTimedOutPetals) {
                console.log(`PM approval for petal ${petal.id} has timed out. Auto-approving.`);
                await client.query(`UPDATE petals SET status = 'completed' WHERE id = $1`, [petal.id]);

                const finalizeResult = await petalController.finalizePetal(petal.id, client, io);
                if (finalizeResult.error) {
                    console.error(`Error finalizing timed-out petal ${petal.id}:`, finalizeResult.error);
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
                    console.error(`Error creating story node for timed-out petal:`, result.reason);
                } else if (!result.value.ok) {
                    result.value.text().then(errorText => {
                         console.error(`Error response when creating story node for timed-out petal: ${result.value.status} ${result.value.statusText}`, errorText);
                    });
                }
            });
        }

    } catch (error) {
        console.error('Error checking for petal timeouts:', error);
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
