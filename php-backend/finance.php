<?php
/**
 * CRUD API Transaksi Keuangan (MySQL)
 * Mendukung GET, POST, PUT, DELETE
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_GET['userId'] ?? 'local_user';

switch ($method) {
    case 'GET':
        // READ ALL FINANCE ENTRIES
        $stmt = $pdo->prepare("SELECT * FROM `finance_entries` WHERE `user_id` = ? ORDER BY `date` DESC");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        $result = [];
        foreach ($rows as $r) {
            $item = [
                'id' => $r['id'],
                'type' => $r['type'],
                'amount' => (int)$r['amount'],
                'sourceAccount' => $r['source_account'],
                'category' => $r['category'],
                'description' => $r['description'] ?? '',
                'date' => date('c', strtotime($r['date']))
            ];
            if (!empty($r['destination_account'])) {
                $item['destinationAccount'] = $r['destination_account'];
            }
            $result[] = $item;
        }

        echo json_encode($result);
        break;

    case 'POST':
    case 'PUT':
        // CREATE OR UPDATE FINANCE ENTRY
        $input = getJsonInput();
        $id = $input['id'] ?? ($_GET['id'] ?? ('fin-' . time() . '-' . substr(md5(uniqid()), 0, 5)));
        $uid = $input['userId'] ?? $userId;
        $dateStr = !empty($input['date']) ? date('Y-m-d H:i:s', strtotime($input['date'])) : date('Y-m-d H:i:s');

        $sql = "INSERT INTO `finance_entries` (
            `id`, `user_id`, `type`, `amount`, `source_account`, `destination_account`, `category`, `description`, `date`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            `type` = VALUES(`type`),
            `amount` = VALUES(`amount`),
            `source_account` = VALUES(`source_account`),
            `destination_account` = VALUES(`destination_account`),
            `category` = VALUES(`category`),
            `description` = VALUES(`description`),
            `date` = VALUES(`date`)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id,
            $uid,
            $input['type'] ?? 'expense',
            $input['amount'] ?? 0,
            $input['sourceAccount'] ?? 'cash',
            $input['destinationAccount'] ?? null,
            $input['category'] ?? 'Lainnya',
            $input['description'] ?? '',
            $dateStr
        ]);

        $input['id'] = $id;
        echo json_encode($input);
        break;

    case 'DELETE':
        // DELETE FINANCE ENTRY
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

        $stmt = $pdo->prepare("DELETE FROM `finance_entries` WHERE `id` = ? AND `user_id` = ?");
        $stmt->execute([$id, $userId]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Metode HTTP tidak didukung']);
        break;
}
