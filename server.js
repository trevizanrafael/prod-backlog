const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const http = require('http');
const { Server } = require("socket.io");

const db = require('./db/database');
const { runMigrations } = require('./db/migrations');
const { authenticateToken, checkPermission, bcrypt, jwt, JWT_SECRET } = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in this demo
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed'));
    }
});

// Configure multer for Personal Drive storage
const driveStorageDir = path.join(__dirname, 'drive_storage');
if (!fs.existsSync(driveStorageDir)) {
    fs.mkdirSync(driveStorageDir, { recursive: true });
}

const driveStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, driveStorageDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const driveUpload = multer({
    storage: driveStorage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});


// Get all scopes
app.get('/api/scopes', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM scopes ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching scopes:', error);
        res.status(500).json({ error: 'Failed to fetch scopes' });
    }
});

// Create new scope
app.post('/api/scopes', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Scope name is required' });
        }

        const result = await db.query(
            'INSERT INTO scopes (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating scope:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Scope name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create scope' });
        }
    }
});

// Update scope
app.put('/api/scopes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const result = await db.query(
            'UPDATE scopes SET name = $1, description = $2 WHERE id = $3 RETURNING *',
            [name, description, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Scope not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating scope:', error);
        res.status(500).json({ error: 'Failed to update scope' });
    }
});

// Delete all scopes
app.delete('/api/scopes', async (req, res) => {
    try {
        // Check if there are tasks using scopes (optional, but foreign key constraint might prevent deletion)
        // Assuming ON DELETE SET NULL or similar, but if RESTRICT, we need to handle it.
        // Let's assume we want to force delete or let the DB handle constraints.
        // If tasks reference scopes, we might want to set them to null first or delete them?
        // User asked to "apagar todos os registros de tasks e escopos".
        // If they delete scopes but keep tasks, tasks might have invalid scope_id if no FK constraint or if it's not ON DELETE SET NULL.
        // But usually we delete tasks first if we want to clear everything.
        // If we delete scopes, we should probably set task.scope_id to NULL.

        await db.query('UPDATE tasks SET scope_id = NULL'); // Detach scopes from tasks
        await db.query('DELETE FROM scopes');

        res.json({ message: 'All scopes deleted successfully' });
    } catch (error) {
        console.error('Error deleting all scopes:', error);
        res.status(500).json({ error: 'Failed to delete all scopes' });
    }
});

// Delete scope
app.delete('/api/scopes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query('DELETE FROM scopes WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Scope not found' });
        }

        res.json({ message: 'Scope deleted successfully' });
    } catch (error) {
        console.error('Error deleting scope:', error);
        res.status(500).json({ error: 'Failed to delete scope' });
    }
});

// ==================== TASKS ROUTES ====================

// Get all tasks with optional filters
app.get('/api/tasks', async (req, res) => {
    try {
        const { scope_id, priority, complexity, status, start_date, end_date, kanban_status } = req.query;

        let query = `
      SELECT t.*, s.name as scope_name,
        (SELECT COUNT(*) FROM task_screenshots WHERE task_id = t.id) as screenshot_count
      FROM tasks t
      LEFT JOIN scopes s ON t.scope_id = s.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (scope_id) {
            query += ` AND t.scope_id = $${paramCount}`;
            params.push(scope_id);
            paramCount++;
        }

        if (priority) {
            query += ` AND t.priority = $${paramCount}`;
            params.push(priority);
            paramCount++;
        }

        if (complexity) {
            query += ` AND t.complexity = $${paramCount}`;
            params.push(complexity);
            paramCount++;
        }

        if (status === 'completed') {
            query += ` AND t.completed_at IS NOT NULL`;
        } else if (status === 'pending') {
            query += ` AND t.completed_at IS NULL`;
        }

        if (start_date) {
            query += ` AND t.due_date >= $${paramCount}`;
            params.push(start_date);
            paramCount++;
        }

        if (end_date) {
            query += ` AND t.due_date <= $${paramCount}`;
            params.push(end_date);
            paramCount++;
        }

        if (kanban_status) {
            query += ` AND t.kanban_status = $${paramCount}`;
            params.push(kanban_status);
            paramCount++;
        }

        query += ' ORDER BY t.due_date ASC, t.priority DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Get single task with screenshots
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const taskResult = await db.query(
            `SELECT t.*, s.name as scope_name 
       FROM tasks t 
       LEFT JOIN scopes s ON t.scope_id = s.id 
       WHERE t.id = $1`,
            [id]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const screenshotsResult = await db.query(
            'SELECT * FROM task_screenshots WHERE task_id = $1 ORDER BY created_at',
            [id]
        );

        const task = taskResult.rows[0];
        task.screenshots = screenshotsResult.rows;

        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
    try {
        const {
            name,
            description_problem,
            description_solution,
            due_date,
            complexity,
            priority,
            scope_id,
            kanban_status
        } = req.body;

        if (!name || !due_date || !complexity || !priority) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await db.query(
            `INSERT INTO tasks 
       (name, description_problem, description_solution, due_date, complexity, priority, scope_id, time_spent, kanban_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)
       RETURNING *`,
            [name, description_problem, description_solution, due_date, complexity, priority, scope_id || null, kanban_status || 'pending']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description_problem,
            description_solution,
            due_date,
            complexity,
            priority,
            scope_id,
            time_spent,
            resolution_notes,
            kanban_status
        } = req.body;

        const result = await db.query(
            `UPDATE tasks 
       SET name = COALESCE($1, name), 
           description_problem = COALESCE($2, description_problem), 
           description_solution = COALESCE($3, description_solution),
           due_date = COALESCE($4, due_date), 
           complexity = COALESCE($5, complexity), 
           priority = COALESCE($6, priority), 
           scope_id = COALESCE($7, scope_id),
           time_spent = COALESCE($8, time_spent), 
           resolution_notes = COALESCE($9, resolution_notes),
           kanban_status = COALESCE($10, kanban_status)
       WHERE id = $11
       RETURNING *`,
            [name, description_problem, description_solution, due_date, complexity, priority, scope_id, time_spent, resolution_notes, kanban_status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Update task timer
app.post('/api/tasks/:id/timer', async (req, res) => {
    try {
        const { id } = req.params;
        const { time_spent } = req.body;

        const result = await db.query(
            'UPDATE tasks SET time_spent = $1 WHERE id = $2 RETURNING *',
            [time_spent, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task timer:', error);
        res.status(500).json({ error: 'Failed to update task timer' });
    }
});

// Mark task as completed
app.patch('/api/tasks/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { completed, resolution_notes } = req.body;

        const completedAt = completed ? new Date().toISOString() : null;

        let query = 'UPDATE tasks SET completed_at = $1';
        const params = [completedAt, id];

        if (completed) {
            query = 'UPDATE tasks SET completed_at = $1, kanban_status = \'completed\'';
        } else {
            query = 'UPDATE tasks SET completed_at = $1, kanban_status = \'pending\''; // Reset to pending if uncompleted
        }

        if (resolution_notes !== undefined) {
            query += ', resolution_notes = $2';
            params.splice(1, 0, resolution_notes); // Insert at index 1
            params[2] = id; // Move id to index 2
        }

        query += ' WHERE id = $' + params.length + ' RETURNING *';

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task completion:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete all tasks
app.delete('/api/tasks', async (req, res) => {
    try {
        // First delete all screenshots files
        const screenshots = await db.query('SELECT * FROM task_screenshots');
        for (const screenshot of screenshots.rows) {
            const filePath = path.join(__dirname, screenshot.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Delete from database (cascade will handle screenshots records)
        await db.query('DELETE FROM tasks');

        // Reset sequence if needed (optional, but good for clean slate)
        // await db.query('ALTER SEQUENCE tasks_id_seq RESTART WITH 1');

        res.json({ message: 'All tasks deleted successfully' });
    } catch (error) {
        console.error('Error deleting all tasks:', error);
        res.status(500).json({ error: 'Failed to delete all tasks' });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get screenshots to delete files
        const screenshots = await db.query(
            'SELECT * FROM task_screenshots WHERE task_id = $1',
            [id]
        );

        // Delete screenshot files
        for (const screenshot of screenshots.rows) {
            const filePath = path.join(__dirname, screenshot.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Delete task (screenshots will be cascade deleted)
        const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// ==================== SCREENSHOTS ROUTES ====================

// Upload screenshot for a task
app.post('/api/tasks/:id/screenshots', upload.single('screenshot'), async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'problem' or 'resolution'

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await db.query(
            'INSERT INTO task_screenshots (task_id, filename, path, type) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, req.file.filename, `/uploads/${req.file.filename}`, type || 'problem']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error uploading screenshot:', error);
        res.status(500).json({ error: 'Failed to upload screenshot' });
    }
});

// Delete screenshot
app.delete('/api/screenshots/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM task_screenshots WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, result.rows[0].path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'Screenshot deleted successfully' });
    } catch (error) {
        console.error('Error deleting screenshot:', error);
        res.status(500).json({ error: 'Failed to delete screenshot' });
    }
});

// ==================== DASHBOARD ROUTES ====================

// Get dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Tasks completed this month by priority
        const completedByPriority = await db.query(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      WHERE completed_at >= $1 AND completed_at <= $2
      GROUP BY priority
    `, [firstDayOfMonth, lastDayOfMonth]);

        // Tasks that should have been completed vs actually completed
        const shouldBeCompleted = await db.query(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE due_date < $1 AND completed_at IS NULL
    `, [now]);

        const actuallyCompleted = await db.query(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE completed_at IS NOT NULL
    `);

        const totalTasks = await db.query('SELECT COUNT(*) as count FROM tasks');

        // Tasks by scope
        const tasksByScope = await db.query(`
      SELECT s.name, COUNT(t.id) as count
      FROM scopes s
      LEFT JOIN tasks t ON s.id = t.scope_id
      GROUP BY s.id, s.name
      ORDER BY count DESC
    `);

        // Tasks by complexity
        const tasksByComplexity = await db.query(`
      SELECT complexity, COUNT(*) as count
      FROM tasks
      GROUP BY complexity
    `);

        // Overdue tasks
        const overdueTasks = await db.query(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE due_date < $1 AND completed_at IS NULL
    `, [now]);

        // Average completion time
        const avgCompletionTime = await db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as avg_days
      FROM tasks
      WHERE completed_at IS NOT NULL
    `);

        // Monthly task creation trend (last 6 months)
        const monthlyTrend = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as created,
        COUNT(completed_at) as completed
      FROM tasks
      WHERE created_at >= $1
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `, [new Date(now.getFullYear(), now.getMonth() - 5, 1)]);

        // Time by Scope (Total seconds spent per scope)
        const timeByScope = await db.query(`
      SELECT s.name, SUM(t.time_spent) as total_seconds
      FROM tasks t
      JOIN scopes s ON t.scope_id = s.id
      WHERE t.time_spent > 0
      GROUP BY s.name
      ORDER BY total_seconds DESC
    `);

        // Bottlenecks (Average delay in days per scope for overdue tasks)
        // Delay = Completed At - Due Date (if completed late) OR Now - Due Date (if pending and overdue)
        const bottlenecks = await db.query(`
      SELECT s.name, AVG(
        CASE 
          WHEN t.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (t.completed_at::timestamp - t.due_date::timestamp))/86400
          ELSE EXTRACT(EPOCH FROM ($1::timestamp - t.due_date::timestamp))/86400
        END
      ) as avg_delay_days
      FROM tasks t
      JOIN scopes s ON t.scope_id = s.id
      WHERE t.due_date < $1 
      AND (t.completed_at IS NULL OR t.completed_at > t.due_date)
      GROUP BY s.name
      ORDER BY avg_delay_days DESC
      LIMIT 5
    `, [now]);

        res.json({
            completedByPriority: completedByPriority.rows,
            shouldBeCompleted: parseInt(shouldBeCompleted.rows[0].count),
            actuallyCompleted: parseInt(actuallyCompleted.rows[0].count),
            totalTasks: parseInt(totalTasks.rows[0].count),
            tasksByScope: tasksByScope.rows,
            tasksByComplexity: tasksByComplexity.rows,
            overdueTasks: parseInt(overdueTasks.rows[0].count),
            avgCompletionTime: parseFloat(avgCompletionTime.rows[0].avg_days || 0).toFixed(1),
            monthlyTrend: monthlyTrend.rows,
            timeByScope: timeByScope.rows,
            bottlenecks: bottlenecks.rows
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Get priority task for home page
app.get('/api/tasks/priority/top', async (req, res) => {
    try {
        const result = await db.query(`
      SELECT t.*, s.name as scope_name,
        (SELECT COUNT(*) FROM task_screenshots WHERE task_id = t.id) as screenshot_count
      FROM tasks t
      LEFT JOIN scopes s ON t.scope_id = s.id
      WHERE t.completed_at IS NULL
      ORDER BY 
        CASE t.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        t.due_date ASC
      LIMIT 1
    `);

        if (result.rows.length === 0) {
            return res.json(null);
        }

        // Get screenshots for this task
        const screenshots = await db.query(
            'SELECT * FROM task_screenshots WHERE task_id = $1',
            [result.rows[0].id]
        );

        const task = result.rows[0];
        task.screenshots = screenshots.rows;

        res.json(task);
    } catch (error) {
        console.error('Error fetching priority task:', error);
        res.status(500).json({ error: 'Failed to fetch priority task' });
    }
});

// Execute raw SQL (SuperUser only)
app.post('/api/admin/sql', authenticateToken, async (req, res) => {
    try {
        // Double check if user is SuperUser or Admin
        if (req.user.username !== 'SuperUser' && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Unauthorized. SuperUser/Admin access required.' });
        }

        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        // Execute query
        const result = await db.query(query);

        // Return results depending on query type (SELECT returns rows, others return rowCount)
        res.json({
            rows: result.rows,
            rowCount: result.rowCount,
            command: result.command
        });
    } catch (error) {
        console.error('SQL Execution Error:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==================== PERSONAL DRIVE ROUTES ====================

// Get folder contents (folders + files)
app.get('/api/drive', authenticateToken, async (req, res) => {
    try {
        const { folder_id } = req.query;
        // Verify folder owner if folder_id is provided
        if (folder_id) {
            const folderCheck = await db.query('SELECT user_id FROM folders WHERE id = $1', [folder_id]);
            if (folderCheck.rows.length === 0) return res.status(404).json({ error: 'Folder not found' });
            // For now, assuming personal drive: only access own folders or if admin? 
            // Let's stick to "Personal": user_id must match req.user.id
            // UNLESS SupreUser/Admin who might want to see everything? 
            // Requirement: "Personal Drive module". Let's restrict to own files.
            // If shared in future, we check permissions.
            // For Strict Personal Drive:
            if (folderCheck.rows[0].user_id !== req.user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const userId = req.user.id;

        // Fetch folders
        let folderQuery = 'SELECT * FROM folders WHERE user_id = $1';
        const folderParams = [userId];
        if (folder_id) {
            folderQuery += ' AND parent_id = $2';
            folderParams.push(folder_id);
        } else {
            folderQuery += ' AND parent_id IS NULL';
        }
        folderQuery += ' ORDER BY name';
        const folders = await db.query(folderQuery, folderParams);

        // Fetch files
        let fileQuery = 'SELECT * FROM files WHERE user_id = $1';
        const fileParams = [userId];
        if (folder_id) {
            fileQuery += ' AND folder_id = $2';
            fileParams.push(folder_id);
        } else {
            fileQuery += ' AND folder_id IS NULL';
        }
        fileQuery += ' ORDER BY name';
        const files = await db.query(fileQuery, fileParams);

        // Fetch breadcrumbs
        let breadcrumbs = [];
        if (folder_id) {
            // Recursive CTE to get path
            const breadcrumbQuery = `
                WITH RECURSIVE folder_path AS (
                    SELECT id, name, parent_id, 1 as level 
                    FROM folders WHERE id = $1
                    UNION ALL
                    SELECT f.id, f.name, f.parent_id, fp.level + 1
                    FROM folders f
                    JOIN folder_path fp ON f.id = fp.parent_id
                )
                SELECT id, name FROM folder_path ORDER BY level DESC;
            `;
            const breadcrumbResult = await db.query(breadcrumbQuery, [folder_id]);
            breadcrumbs = breadcrumbResult.rows;
        }

        res.json({
            folders: folders.rows,
            files: files.rows,
            breadcrumbs: breadcrumbs
        });

    } catch (error) {
        console.error('Error fetching drive content:', error);
        res.status(500).json({ error: 'Failed to fetch drive content' });
    }
});

// Create new folder
app.post('/api/drive/folders', authenticateToken, async (req, res) => {
    try {
        const { name, parent_id } = req.body;
        if (!name) return res.status(400).json({ error: 'Folder name is required' });

        const result = await db.query(
            'INSERT INTO folders (name, parent_id, user_id) VALUES ($1, $2, $3) RETURNING *',
            [name, parent_id || null, req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// Upload file
app.post('/api/drive/upload', authenticateToken, driveUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { folder_id } = req.body;
        const { originalname, filename, size, mimetype } = req.file;
        const storagePath = `drive_storage/${filename}`; // Relative path or just filename. 
        // Let's store relative to root or absolute?
        // driveStorageDir is absolute. 
        // Let's store relative to project root so we can resolve it later.
        // Or relative to drive_storage dir.
        // In DB we can store 'drive_storage/filename'.

        const result = await db.query(
            `INSERT INTO files 
            (name, original_name, path, size, type, folder_id, user_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`,
            [originalname, originalname, `drive_storage/${filename}`, size, mimetype, folder_id || null, req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Rename item
app.put('/api/drive/rename', authenticateToken, async (req, res) => {
    try {
        const { type, id, name } = req.body; // type: 'folder' or 'file'
        if (!name) return res.status(400).json({ error: 'New name is required' });

        const table = type === 'folder' ? 'folders' : 'files';

        // Check ownership
        const check = await db.query(`SELECT user_id FROM ${table} WHERE id = $1`, [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
        if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        const result = await db.query(
            `UPDATE ${table} SET name = $1 WHERE id = $2 RETURNING *`,
            [name, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error renaming item:', error);
        res.status(500).json({ error: 'Failed to rename item' });
    }
});

// Delete item
app.delete('/api/drive/:type/:id', authenticateToken, async (req, res) => {
    try {
        const { type, id } = req.params;
        const userId = req.user.id;

        if (type === 'file') {
            const fileRes = await db.query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [id, userId]);
            if (fileRes.rows.length === 0) return res.status(404).json({ error: 'File not found' });

            const file = fileRes.rows[0];
            const fullPath = path.join(__dirname, file.path); // Assuming path stored as 'drive_storage/filename'
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

            await db.query('DELETE FROM files WHERE id = $1', [id]);

        } else if (type === 'folder') {
            // Recursive file deletion helper
            const deleteFolderContents = async (folderId) => {
                // Find subfolders
                const subfolders = await db.query('SELECT id FROM folders WHERE parent_id = $1 AND user_id = $2', [folderId, userId]);
                for (const sub of subfolders.rows) {
                    await deleteFolderContents(sub.id);
                }

                // Find files in this folder
                const files = await db.query('SELECT * FROM files WHERE folder_id = $1 AND user_id = $2', [folderId, userId]);
                for (const file of files.rows) {
                    const fullPath = path.join(__dirname, file.path);
                    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                }
            };

            const folderRes = await db.query('SELECT * FROM folders WHERE id = $1 AND user_id = $2', [id, userId]);
            if (folderRes.rows.length === 0) return res.status(404).json({ error: 'Folder not found' });

            // Delete physical files recursively
            await deleteFolderContents(id);

            // Delete folder Record (DB cascade handles the rest of DB rows)
            await db.query('DELETE FROM folders WHERE id = $1', [id]);
        }

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Download/Stream file
app.get('/api/drive/files/:id/content', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // Enforce security

        const fileRes = await db.query('SELECT * FROM files WHERE id = $1', [id]);
        if (fileRes.rows.length === 0) return res.status(404).json({ error: 'File not found' });

        const file = fileRes.rows[0];
        if (file.user_id !== userId) return res.status(403).json({ error: 'Access denied' });

        const fullPath = path.join(__dirname, file.path);
        if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on server' });

        res.download(fullPath, file.original_name); // Sets disposition and streams
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// ==================== SOCKET.IO LOGIC ====================


io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a specific room
    socket.on('join-room', (roomId, userId, userName) => {
        console.log(`User ${userId} (${userName || 'Anonymous'}) joining room ${roomId}`);
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-connected', userId, userName);

        socket.on('disconnect', () => {
            console.log(`User ${userId} disconnected`);
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
        });
    });

    // Handle signaling data (WebRTC)
    // data contains: target (socketId), signal (SDP/candidate), callerId
    socket.on('signal', (data) => {
        io.to(data.target).emit('signal', {
            signal: data.signal,
            callerId: data.callerId,
            metadata: data.metadata // Pass through metadata (name, type)
        });
    });

    // Handle Chat Messages
    socket.on('send-chat-message', (roomId, message, userName) => {
        socket.broadcast.to(roomId).emit('receive-chat-message', {
            message: message,
            senderId: socket.id,
            userName: userName
        });
    });
});

// ==================== SERVER INITIALIZATION ====================

// Initialize server
async function startServer() {
    try {
        // Run database migrations
        await runMigrations();

        // Start HTTP server (which wraps Express)
        server.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}`);
            console.log(`Meet: http://localhost:${PORT}/meet.html`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// ==================== MEETINGS ROUTES ====================

// Search users for invite
app.get('/api/users/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Case-insensitive search, exclude current user
        const result = await db.query(
            "SELECT id, username, name FROM users WHERE (username ILIKE $1 OR name ILIKE $1) AND id != $2 LIMIT 10",
            [`%${q}%`, req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Create meeting
app.post('/api/meetings', authenticateToken, async (req, res) => {
    try {
        const { title, scheduled_at, password, invite_ids } = req.body;

        if (!title || !scheduled_at) {
            return res.status(400).json({ error: 'Title and date required' });
        }

        let password_hash = null;
        if (password && password.trim()) {
            password_hash = await bcrypt.hash(password, 10);
        }

        // Generate unique room ID
        const room_id = 'meet-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // 1. Insert Meeting
        const result = await db.query(
            `INSERT INTO meetings (title, scheduled_at, password_hash, room_id, creator_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, scheduled_at, password_hash, room_id, req.user.id]
        );
        const meeting = result.rows[0];

        // 2. Insert Invites
        if (invite_ids && Array.isArray(invite_ids) && invite_ids.length > 0) {
            // Bulk insert or loop? Loop is easier to write safely
            for (const userId of invite_ids) {
                await db.query(
                    `INSERT INTO meeting_invites (meeting_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [meeting.id, userId]
                );
            }
        }

        res.status(201).json(meeting);
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

// Get My Meetings (Created by me OR Invited to)
app.get('/api/meetings', authenticateToken, async (req, res) => {
    try {
        // We want upcoming meetings mostly, or all? Let's return all upcoming + recent past?
        // Let's return ALL for now, ordered by date desc

        const result = await db.query(`
            SELECT 
                m.id, m.title, m.scheduled_at, m.room_id, m.creator_id,
                u.name as creator_name,
                CASE 
                    WHEN m.creator_id = $1 THEN 'host'
                    ELSE 'guest'
                END as role
            FROM meetings m
            JOIN users u ON m.creator_id = u.id
            LEFT JOIN meeting_invites mi ON m.id = mi.meeting_id
            WHERE m.creator_id = $1 OR mi.user_id = $1
            GROUP BY m.id, u.name
            ORDER BY m.scheduled_at ASC
        `, [req.user.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

// Check if meeting has password
app.get('/api/meetings/check/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const result = await db.query('SELECT title, password_hash FROM meetings WHERE room_id = $1', [roomId]);

        if (result.rows.length === 0) {
            // Meeting not found in DB? 
            // If we allow ad-hoc rooms without DB record, we assume no password.
            // But strict mode: assume public if not found? Or not allow?
            // "meet.js" used to just join any string. 
            // Let's assume: Not found = No Password (Ad-hoc)
            return res.json({ protected: false, title: 'Reunião' });
        }

        const meeting = result.rows[0];
        res.json({
            protected: !!meeting.password_hash,
            title: meeting.title
        });
    } catch (error) {
        console.error('Error checking meeting:', error);
        res.status(500).json({ error: 'Check failed' });
    }
});

// Verify meeting password
app.post('/api/meetings/verify/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { password } = req.body;

        const result = await db.query('SELECT password_hash FROM meetings WHERE room_id = $1', [roomId]);

        if (result.rows.length === 0) {
            return res.json({ success: true }); // No record = No password
        }

        const meeting = result.rows[0];
        if (!meeting.password_hash) {
            return res.json({ success: true }); // Record exists but no password
        }

        if (!password) {
            return res.json({ success: false });
        }

        const valid = await bcrypt.compare(password, meeting.password_hash);
        res.json({ success: valid });
    } catch (error) {
        console.error('Error verifying password:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// ================== AUTHENTICATION ROUTES ==================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const result = await db.query(
            'SELECT u.*, r.permissions, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, name: user.name, role_id: user.role_id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role_name,
                permissions: user.permissions
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Visitor Login endpoint
app.post('/api/auth/visitor', async (req, res) => {
    try {
        // Get Visualizador role
        const roleResult = await db.query("SELECT * FROM roles WHERE name = 'Visualizador'");
        if (roleResult.rows.length === 0) {
            return res.status(500).json({ error: 'Visitor role not found' });
        }
        const role = roleResult.rows[0];

        // Create a visitor token
        const token = jwt.sign(
            {
                id: 0, // Special ID for visitor
                username: 'visitor',
                name: 'Visitante',
                role_id: role.id
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: 0,
                username: 'visitor',
                name: 'Visitante',
                role: 'Visualizador',
                role_id: role.id,
                permissions: role.permissions
            }
        });
    } catch (error) {
        console.error('Visitor login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT u.id, u.username, u.name, r.name as role, r.permissions FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

// ================== ROLES ROUTES (Admin only) ==================

// Get all roles
app.get('/api/roles', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM roles ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// Create new role
app.post('/api/roles', authenticateToken, async (req, res) => {
    try {
        const { name, permissions } = req.body;

        if (!name || !permissions) {
            return res.status(400).json({ error: 'Name and permissions required' });
        }

        const result = await db.query(
            'INSERT INTO roles (name, permissions) VALUES ($1, $2) RETURNING *',
            [name, JSON.stringify(permissions)]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating role:', error);
        if (error.code === '23505') {
            res.status(409).json({ error: 'Role name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create role' });
        }
    }
});

// Update role
app.put('/api/roles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, permissions } = req.body;

        const result = await db.query(
            'UPDATE roles SET name = $1, permissions = $2 WHERE id = $3 RETURNING *',
            [name, JSON.stringify(permissions), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// Delete role
app.delete('/api/roles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query('DELETE FROM roles WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

// ================== USERS ROUTES (Admin only) ==================

// Get all users
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT u.id, u.username, u.name, u.created_at, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create new user
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { username, password, name, role_id } = req.body;

        if (!username || !password || !name || !role_id) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await db.query(
            'INSERT INTO users (username, password_hash, name, role_id) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role_id, created_at',
            [username, password_hash, name, role_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === '23505') {
            res.status(409).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
});

// Update user
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, name, role_id } = req.body;

        let query, params;
        if (password) {
            const password_hash = await bcrypt.hash(password, 10);
            query = 'UPDATE users SET username = $1, password_hash = $2, name = $3, role_id = $4 WHERE id = $5 RETURNING id, username, name, role_id, created_at';
            params = [username, password_hash, name, role_id, id];
        } else {
            query = 'UPDATE users SET username = $1, name = $2, role_id = $3 WHERE id = $4 RETURNING id, username, name, role_id, created_at';
            params = [username, name, role_id, id];
        }

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete all users (except requester and SuperUser)
app.delete('/api/users', authenticateToken, async (req, res) => {
    try {
        // Check if user is SuperUser
        if (req.user.username !== 'SuperUser') {
            return res.status(403).json({ error: 'Only SuperUser can delete all users' });
        }

        await db.query("DELETE FROM users WHERE username != 'SuperUser' AND id != $1", [req.user.id]);
        res.json({ message: 'All users deleted successfully' });
    } catch (error) {
        console.error('Error deleting users:', error);
        res.status(500).json({ error: 'Failed to delete users' });
    }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

startServer();
