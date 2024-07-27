<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if ($data === null) {
        throw new Exception('Invalid JSON data');
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

    $quotations[] = $data;

    if (file_put_contents($quotationsFile, json_encode($quotations, JSON_PRETTY_PRINT)) === false) {
        throw new Exception('Failed to save quotation');
    }

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>