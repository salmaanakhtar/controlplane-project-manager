import { pool } from './config/database.js';

const STALE_REVIEW_THRESHOLD_HOURS = 24;

const findStaleReviewTasks = async (): Promise<number[]> => {
  const result = await pool.query(
    `SELECT id FROM tasks 
     WHERE status = 'review' 
     AND updated_at < NOW() - INTERVAL '1 hour' * $1
     ORDER BY updated_at ASC`,
    [STALE_REVIEW_THRESHOLD_HOURS]
  );
  
  return result.rows.map(row => row.id);
};

const processStaleTasks = async (): Promise<void> => {
  console.log(`[${new Date().toISOString()}] Running stale review task check...`);
  
  try {
    const staleTaskIds = await findStaleReviewTasks();
    
    if (staleTaskIds.length === 0) {
      console.log(`[${new Date().toISOString()}] No stale review tasks found.`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] Found ${staleTaskIds.length} stale review task(s):`);
    
    for (const taskId of staleTaskIds) {
      // Get task details
      const taskResult = await pool.query(
        `SELECT t.id, t.title, p.name as project_name, t.updated_at
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.id = $1`,
        [taskId]
      );
      
      if (taskResult.rows.length > 0) {
        const task = taskResult.rows[0];
        const hoursAgo = Math.floor(
          (Date.now() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60)
        );
        
        console.warn(`[${new Date().toISOString()}] WARNING: Task #${task.id} "${task.title}" (Project: ${task.project_name}) has been in review for ${hoursAgo} hours.`);
      }
    }
    
    console.log(`[${new Date().toISOString()}] Stale review task check complete.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing stale tasks:`, error);
  }
};

// Run immediately on startup
processStaleTasks();

// Schedule to run every hour
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

setInterval(processStaleTasks, CHECK_INTERVAL_MS);

console.log(`[${new Date().toISOString()}] Background worker started. Will check for stale review tasks every ${CHECK_INTERVAL_MS / 1000 / 60} minutes.`);
