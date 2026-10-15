<?php
/**
 * Konfigurasi Database MySQL / MariaDB (PDO)
 * Digunakan untuk integrasi dengan phpMyAdmin / XAMPP / Laragon
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Tangani Preflight Request OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =====================================================================
// PENGATURAN KONEKSI DATABASE
// =====================================================================
$db_host = getenv('MYSQL_HOST') ?: '127.0.0.1';
$db_port = getenv('MYSQL_PORT') ?: '3306';
$db_user = getenv('MYSQL_USER') ?: 'root';
$db_pass = getenv('MYSQL_PASSWORD') ?: '';
$db_name = getenv('MYSQL_DATABASE') ?: 'catatan_harian_db';

try {
    $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Gagal terkoneksi ke database MySQL',
        'message' => $e->getMessage(),
        'hint' => 'Pastikan MySQL di XAMPP / Laragon sudah menyala (Start) dan database sudah dibuat di phpMyAdmin.'
    ]);
    exit();
}

/**
 * Helper untuk membaca JSON Body dari Request
 */
function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}
