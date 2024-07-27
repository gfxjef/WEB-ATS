<?php
header('Content-Type: application/json');

// Asegúrate de que los errores de PHP no se muestren en la salida
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 30;

    $offset = ($page - 1) * $limit;

    // Log de los parámetros recibidos
    error_log("Received request - Page: $page, Limit: $limit, Offset: $offset");

    // Simular datos si no tienes una base de datos configurada
    $products = [];
    for ($i = 0; $i < $limit; $i++) {
        $currentPrice = rand(10, 100);
        $products[] = [
            'SKU' => 'SKU' . ($offset + $i + 1),
            'Nombre' => 'Producto ' . ($offset + $i + 1),
            'Modelo' => 'Modelo ' . chr(65 + ($i % 26)), // A, B, C, ...
            'Tamaño' => rand(1, 10) . ' ' . ['cm', 'in', 'm'][rand(0, 2)],
            'Categoria' => ['Electrónica', 'Ropa', 'Hogar', 'Deportes'][rand(0, 3)],
            'Precio' => [$currentPrice, $currentPrice * 1.15],
            'Stock' => 'Con Stock',
            'Photo' => 'https://via.placeholder.com/150?text=Producto+' . ($offset + $i + 1),
            'Sub Categoria' => 'SubCat ' . chr(65 + ($i % 5)), // A, B, C, D, E
            'Sub Categoria Nivel' => rand(1, 3)
        ];
    }

    $response = ['products' => $products];
    
    // Log de la respuesta (ten cuidado con logs muy grandes en producción)
    error_log("Sending response with " . count($products) . " products");

    echo json_encode($response);
} catch (Exception $e) {
    // Log the error server-side
    error_log('Error in get_products.php: ' . $e->getMessage());
    // Send a generic error message to the client
    echo json_encode(['error' => 'An error occurred while fetching products']);
}