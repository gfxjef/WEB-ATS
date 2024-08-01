<?php
// Configuración de errores y logging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'error.log');

// Configurar la zona horaria para Perú
date_default_timezone_set('America/Lima');

// Encabezados CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Manejar la solicitud OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header('Content-Type: application/json');

function logMessage($message) {
    error_log(date('[Y-m-d H:i:s] ') . $message . "\n", 3, 'quotation.log');
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if ($data === null) {
        throw new Exception('Invalid JSON data');
    }

    // Validación básica de datos
    if (!isset($data['code']) || !isset($data['items']) || !is_array($data['items'])) {
        throw new Exception('Missing required fields');
    }

    $quotationsFile = 'cotizaciones.json';

    if (!file_exists($quotationsFile)) {
        if (file_put_contents($quotationsFile, json_encode([])) === false) {
            throw new Exception('Failed to create quotations file');
        }
    }

    $quotations = json_decode(file_get_contents($quotationsFile), true);
    if ($quotations === null) {
        throw new Exception('Failed to read existing quotations');
    }

    // Añadir timestamp a la cotización con la zona horaria de Perú
    $data['timestamp'] = date('Y-m-d H:i:s');

    $quotations[] = $data;

    if (file_put_contents($quotationsFile, json_encode($quotations, JSON_PRETTY_PRINT)) === false) {
        throw new Exception('Failed to save quotation');
    }

    logMessage("Quotation saved successfully: " . $data['code']);
    echo json_encode(['success' => true, 'message' => 'Quotation saved successfully']);
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>