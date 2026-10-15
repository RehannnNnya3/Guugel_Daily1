<?php
/**
 * API Pengaturan Kategori & Rekening Kustom (MySQL)
 * Mendukung GET dan POST
 */
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_GET['userId'] ?? 'local_user';

switch ($method) {
    case 'GET':
        // Ambil User Settings
        $stmtSettings = $pdo->prepare("SELECT * FROM `user_settings` WHERE `user_id` = ?");
        $stmtSettings->execute([$userId]);
        $settingsRow = $stmtSettings->fetch();

        $customCategories = ['Kesehatan', 'Pekerjaan'];
        $financeCategories = [
            'income' => ['Gaji', 'Freelance', 'Hadiah', 'Investasi'],
            'expense' => ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'],
            'transfer' => ['Transfer Antar Rekening']
        ];

        if ($settingsRow) {
            if (!empty($settingsRow['activity_categories'])) {
                $customCategories = json_decode($settingsRow['activity_categories'], true) ?: $customCategories;
            }
            if (!empty($settingsRow['finance_categories'])) {
                $financeCategories = json_decode($settingsRow['finance_categories'], true) ?: $financeCategories;
            }
        }

        // Ambil Custom Accounts
        $stmtAccounts = $pdo->prepare("SELECT * FROM `custom_accounts` WHERE `user_id` = ?");
        $stmtAccounts->execute([$userId]);
        $accountRows = $stmtAccounts->fetchAll();

        $customAccounts = [];
        foreach ($accountRows as $acc) {
            $customAccounts[] = [
                'id' => $acc['id'],
                'name' => $acc['name'],
                'type' => $acc['type']
            ];
        }

        if (empty($customAccounts)) {
            $customAccounts = [
                ['id' => 'cash', 'name' => 'Dompet Tunai', 'type' => 'cash'],
                ['id' => 'bank_bri', 'name' => 'BRI', 'type' => 'bank'],
                ['id' => 'bank_seabank', 'name' => 'SeaBank', 'type' => 'bank'],
                ['id' => 'ewallet_dana', 'name' => 'DANA', 'type' => 'ewallet'],
                ['id' => 'ewallet_gopay', 'name' => 'GoPay', 'type' => 'ewallet'],
                ['id' => 'ewallet_shopeepay', 'name' => 'ShopeePay', 'type' => 'ewallet'],
                ['id' => 'ewallet_ovo', 'name' => 'OVO', 'type' => 'ewallet']
            ];
        }

        echo json_encode([
            'customCategories' => $customCategories,
            'financeCategories' => $financeCategories,
            'customAccounts' => $customAccounts
        ]);
        break;

    case 'POST':
        $input = getJsonInput();
        $uid = $input['userId'] ?? $userId;

        $catJson = !empty($input['customCategories']) ? json_encode($input['customCategories']) : null;
        $finCatJson = !empty($input['financeCategories']) ? json_encode($input['financeCategories']) : null;

        $stmt = $pdo->prepare("INSERT INTO `user_settings` (`user_id`, `activity_categories`, `finance_categories`) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                `activity_categories` = COALESCE(VALUES(`activity_categories`), `activity_categories`),
                `finance_categories` = COALESCE(VALUES(`finance_categories`), `finance_categories`)");
        $stmt->execute([$uid, $catJson, $finCatJson]);

        if (!empty($input['customAccounts']) && is_array($input['customAccounts'])) {
            $stmtAcc = $pdo->prepare("INSERT INTO `custom_accounts` (`id`, `user_id`, `name`, `type`) 
                VALUES (?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                    `name` = VALUES(`name`), 
                    `type` = VALUES(`type`)");
            foreach ($input['customAccounts'] as $acc) {
                $stmtAcc->execute([$acc['id'], $uid, $acc['name'], $acc['type']]);
            }
        }

        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Metode HTTP tidak didukung']);
        break;
}
