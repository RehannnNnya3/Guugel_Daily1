<?php
/**
 * CRUD API Kegiatan / Tugas Harian (MySQL)
 * Mendukung GET, POST, PUT, DELETE
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_GET['userId'] ?? 'local_user';

switch ($method) {
    case 'GET':
        // READ ALL ACTIVITIES
        $stmt = $pdo->prepare("SELECT * FROM `activity_entries` WHERE `user_id` = ? ORDER BY `deadline` ASC");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $r) {
            $subtasks = [];
            if (!empty($r['course_subtasks'])) {
                $subtasks = json_decode($r['course_subtasks'], true) ?: [];
            }

            $item = [
                'id' => $r['id'],
                'title' => $r['title'],
                'content' => $r['content'] ?? '',
                'category' => $r['category'],
                'urgency' => $r['urgency'],
                'status' => $r['status'],
                'createdAt' => date('c', strtotime($r['created_at'])),
                'deadline' => date('c', strtotime($r['deadline'])),
                'reminderEnabled' => (bool)$r['reminder_enabled'],
                'reminderSent' => (bool)$r['reminder_sent'],
            ];

            if (!empty($r['reminder_time'])) {
                $item['reminderTime'] = date('c', strtotime($r['reminder_time']));
            }

            if ($r['category'] === 'game') {
                $item['gameDetails'] = [
                    'platform' => $r['game_platform'] ?: 'PC',
                    'dailyQuest' => $r['game_daily_quest'] ?: '',
                    'playtimeMinutes' => (int)($r['game_playtime_minutes'] ?: 60)
                ];
            }

            if ($r['category'] === 'kuliah') {
                $item['courseDetails'] = [
                    'courseName' => $r['course_name'] ?: '',
                    'subtasks' => $subtasks
                ];
            }

            if ($r['category'] === 'rutinitas') {
                $item['routineDetails'] = [
                    'frequency' => $r['routine_frequency'] ?: 'daily',
                    'timeOfDay' => $r['routine_time_of_day'] ?: '07:00',
                    'customResetDays' => $r['routine_custom_reset_days'] ? (int)$r['routine_custom_reset_days'] : null,
                    'lastResetAt' => !empty($r['routine_last_reset_at']) ? date('c', strtotime($r['routine_last_reset_at'])) : null
                ];
            }

            $result[] = $item;
        }

        echo json_encode($result);
        break;

    case 'POST':
    case 'PUT':
        // CREATE OR UPDATE ACTIVITY
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? ('task-' . time() . '-' . substr(md5(uniqid()), 0, 5)));
        $uid = $input['userId'] ?? $userId;
        
        $deadlineStr = !empty($input['deadline']) ? date('Y-m-d H:i:s', strtotime($input['deadline'])) : date('Y-m-d H:i:s');
        $reminderTimeStr = !empty($input['reminderTime']) ? date('Y-m-d H:i:s', strtotime($input['reminderTime'])) : null;
        $subtasksJson = !empty($input['courseDetails']['subtasks']) ? json_encode($input['courseDetails']['subtasks']) : null;

        $sql = "INSERT INTO `activity_entries` (
            `id`, `user_id`, `title`, `content`, `category`, `urgency`, `status`,
            `deadline`, `reminder_enabled`, `reminder_time`, `reminder_sent`,
            `game_platform`, `game_daily_quest`, `game_playtime_minutes`,
            `course_name`, `course_subtasks`,
            `routine_frequency`, `routine_time_of_day`, `routine_custom_reset_days`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            `title` = VALUES(`title`),
            `content` = VALUES(`content`),
            `category` = VALUES(`category`),
            `urgency` = VALUES(`urgency`),
            `status` = VALUES(`status`),
            `deadline` = VALUES(`deadline`),
            `reminder_enabled` = VALUES(`reminder_enabled`),
            `reminder_time` = VALUES(`reminder_time`),
            `reminder_sent` = VALUES(`reminder_sent`),
            `game_platform` = VALUES(`game_platform`),
            `game_daily_quest` = VALUES(`game_daily_quest`),
            `game_playtime_minutes` = VALUES(`game_playtime_minutes`),
            `course_name` = VALUES(`course_name`),
            `course_subtasks` = VALUES(`course_subtasks`),
            `routine_frequency` = VALUES(`routine_frequency`),
            `routine_time_of_day` = VALUES(`routine_time_of_day`),
            `routine_custom_reset_days` = VALUES(`routine_custom_reset_days`)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id,
            $uid,
            $input['title'] ?? '',
            $input['content'] ?? '',
            $input['category'] ?? 'game',
            $input['urgency'] ?? 'medium',
            $input['status'] ?? 'pending',
            $deadlineStr,
            !empty($input['reminderEnabled']) ? 1 : 0,
            $reminderTimeStr,
            !empty($input['reminderSent']) ? 1 : 0,
            $input['gameDetails']['platform'] ?? null,
            $input['gameDetails']['dailyQuest'] ?? null,
            $input['gameDetails']['playtimeMinutes'] ?? 0,
            $input['courseDetails']['courseName'] ?? null,
            $subtasksJson,
            $input['routineDetails']['frequency'] ?? null,
            $input['routineDetails']['timeOfDay'] ?? null,
            $input['routineDetails']['customResetDays'] ?? null
        ]);

        $input['id'] = $id;
        echo json_encode($input);
        break;

    case 'DELETE':
        // DELETE ACTIVITY
        $id = $_GET['id'] ?? null;
        if (!$id) {
            $input = getJsonInput();
            $id = $input['id'] ?? null;
        }

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Parameter id wajib disertakan']);
            exit();
        }

        $stmt = $pdo->prepare("DELETE FROM `activity_entries` WHERE `id` = ? AND `user_id` = ?");
        $stmt->execute([$id, $userId]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Metode HTTP tidak didukung']);
        break;
}
