<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detalles del Producto</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-gray-100">
    <?php include 'header.php'; ?>

    <div class="container mx-auto px-4 py-8">
        <div id="productDetails" class="bg-white p-8 rounded-lg shadow-lg">
            <!-- Los detalles del producto se generarán dinámicamente aquí -->
        </div>
    </div>

    <!-- Carrito deslizable -->
    <div id="shoppingCart" class="fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform translate-x-full transition-transform duration-300 ease-in-out">
        <div class="p-4">
            <h2 class="text-2xl font-bold mb-4">Carrito de Compras</h2>
            <div id="cartItems">
                <!-- Los items del carrito se generarán dinámicamente aquí -->
            </div>
            <div class="mt-4">
                <p class="text-xl font-bold">Total: S/. <span id="cartTotal">0.00</span></p>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
    <script>
        async function loadProductDetails() {
            const urlParams = new URLSearchParams(window.location.search);
            const sku = urlParams.get('sku');
            if (sku) {
                await loadProducts(); // Asegúrate de que esta función esté definida en script.js
                const product = allProducts.find(p => p.SKU === sku);
                if (product) {
                    const productDetails = document.getElementById('productDetails');
                    productDetails.innerHTML = `
                        <h1 class="text-3xl font-bold mb-4">${product.Nombre} ${product.Modelo}</h1>
                        <img src="${product.Photo}" alt="${product.Nombre}" class="w-full max-w-md mb-4">
                        <p class="text-xl mb-2">SKU: ${product.SKU}</p>
                        <p class="text-xl mb-2">Tamaño: ${product.Tamaño}</p>
                        <p class="text-xl mb-2">Categoría: ${product.Categoria}</p>
                        <p class="text-2xl font-bold text-red-600 mb-4">Precio: S/. ${product.Precio[0].toFixed(2)}</p>
                        <button onclick="addToCart('${product.SKU}')" class="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">Añadir al carrito</button>
                        <a href="index.php" class="ml-4 text-blue-500 hover:underline">Volver a la tienda</a>
                    `;
                }
            }
            // Actualizar el carrito después de cargar los detalles del producto
            updateCartDisplay();
        }

        loadProductDetails();

        // Cerrar el carrito cuando se hace clic fuera de él
        document.addEventListener('click', function(event) {
            const cart = document.getElementById('shoppingCart');
            if (!cart.contains(event.target) && !event.target.closest('button[onclick^="addToCart"]')) {
                hideCart();
            }
        });

        // Asegúrate de que los event listeners del header se inicialicen
        document.addEventListener('DOMContentLoaded', function() {
            setupEventListeners();
        });
    </script>
</body>
</html>