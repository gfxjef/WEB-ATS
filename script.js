let allProducts = [];
let currentSubCategory = null;
let currentPage = 1;
const productsPerPage = 30;
let cart = [];
const maxPrice = 500;
let currentFilteredProducts = [];
let currentProduct;


console.log('Script started');


async function loadProducts() {
    if (allProducts.length === 0) {
        try {
            const response = await fetch('productos.json');
            allProducts = await response.json();
            console.log("Productos cargados:", allProducts.length);
        } catch (error) {
            console.error('Error loading products:', error);
            alert('Error loading products. Please check the console for more details.');
        }
    }
}




function handleImageError(img) {
    img.onerror = null; // Previene bucles infinitos
    img.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="100%" height="100%" fill="#808080"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" dy=".3em">No Imagen</text>
        </svg>
    `);
    img.alt = "No Imagen";
}



function generateSubCategories(products) {
    const subCategories = new Map();
    const brandsBySubCategory = new Map();

    products.forEach(product => {
        if (product['Sub Categoria']) {
            const level = product['Sub Categoria Nivel'] !== null ? parseInt(product['Sub Categoria Nivel']) : Infinity;
            subCategories.set(product['Sub Categoria'], level);

            if (!brandsBySubCategory.has(product['Sub Categoria'])) {
                brandsBySubCategory.set(product['Sub Categoria'], new Set());
            }
            
            brandsBySubCategory.get(product['Sub Categoria']).add(
                product['Sub Categoria'] === 'Combos' ? product['Categoria'] : product['Nombre']
            );
        }
    });

    const sortedSubCategories = Array.from(subCategories.entries())
        .sort((a, b) => a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] - b[1]);

    const subCategoryList = document.getElementById('categoryList');
    if (subCategoryList) {
        subCategoryList.innerHTML = sortedSubCategories.map(([subCategory, level]) => {
            const brandsOrCategoriesForThisSubCategory = Array.from(brandsBySubCategory.get(subCategory) || []);
            const filterTitle = subCategory === 'Combos' ? 'Filtro por Categorías' : 'Filtro por Listado de Marcas';
            
            return `
                <li>
<a href="#" onclick="toggleFilter('${subCategory}', event)" class="text-blue-600 hover:underline text-[15px]">${subCategory}</a>

                    <div id="filter-${subCategory}" class="filter-content hidden mt-2 overflow-hidden transition-all duration-300 ease-in-out" style="max-height: 0;">
                        <div class="mb-2">
                            <p class="font-semibold">Filtro por Rango de Precios</p>
                            <div class="price-slider-container relative">
                                <input type="range" min="0" max="${maxPrice}" value="0" class="price-slider absolute" id="minPriceSlider-${subCategory}">
                                <input type="range" min="0" max="${maxPrice}" value="${maxPrice}" class="price-slider absolute" id="maxPriceSlider-${subCategory}">
                            </div>
                            <div class="flex justify-between mt-2">
                                <input type="number" id="minPriceInput-${subCategory}" min="0" max="${maxPrice}" class="w-20 px-2 py-1 border rounded" value="0">
                                <span class="mx-2">a</span>
                                <input type="number" id="maxPriceInput-${subCategory}" min="0" max="${maxPrice}" class="w-20 px-2 py-1 border rounded" value="${maxPrice}">
                            </div>
                        </div>
                        <div>
                            <p class="font-semibold">${filterTitle}</p>
                            <div id="brandList-${subCategory}">
                                ${brandsOrCategoriesForThisSubCategory.map(item => `
                                    <label class="flex items-center">
                                        <input type="checkbox" value="${item}" class="mr-2 brand-checkbox" data-subcategory="${subCategory}">
                                        ${item}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </li>
            `;
        }).join('');

        setupPriceRangeListeners(sortedSubCategories);
    }
}

function setupPriceRangeListeners(sortedSubCategories) {
    sortedSubCategories.forEach(([subCategory]) => {
        const elements = ['minPriceSlider', 'maxPriceSlider', 'minPriceInput', 'maxPriceInput']
            .map(id => document.getElementById(`${id}-${subCategory}`));

        if (elements.every(el => el)) {
            elements.forEach(el => el.addEventListener('input', () => updatePriceRange(subCategory)));
        }

        const checkboxes = document.querySelectorAll(`#brandList-${subCategory} .brand-checkbox`);
        checkboxes.forEach(checkbox => checkbox.addEventListener('change', () => filterProducts(subCategory)));
    });
}

function toggleFilter(subCategory, event) {
    // Prevenir el comportamiento por defecto del enlace
    event.preventDefault();

    const allFilterDivs = document.querySelectorAll('[id^="filter-"]');
    allFilterDivs.forEach(div => {
        const isTarget = div.id === `filter-${subCategory}`;
        div.classList.toggle('hidden', !isTarget);
        div.style.maxHeight = isTarget && !div.classList.contains('hidden') ? `${div.scrollHeight}px` : '0';
    });
    filterBySubCategory(subCategory);
}

function updatePriceRange(subCategory) {
    const [minSlider, maxSlider, minInput, maxInput] = ['minPriceSlider', 'maxPriceSlider', 'minPriceInput', 'maxPriceInput']
        .map(id => document.getElementById(`${id}-${subCategory}`));

    let [minVal, maxVal] = [parseInt(minSlider.value), parseInt(maxSlider.value)];

    if (minVal > maxVal) [minVal, maxVal] = [maxVal, minVal];

    minSlider.value = minInput.value = minVal;
    maxSlider.value = maxInput.value = maxVal;

    const percent1 = (minVal / maxPrice) * 100;
    const percent2 = (maxVal / maxPrice) * 100;
    const backgroundColor = `linear-gradient(to right, #d3d3d3 ${percent1}%, #4CAF50 ${percent1}%, #4CAF50 ${percent2}%, #d3d3d3 ${percent2}%)`;
    [minSlider, maxSlider].forEach(slider => slider.style.background = backgroundColor);

    filterProducts(subCategory, minVal, maxVal);
}

function filterProducts(subCategory) {
    const minPrice = parseInt(document.getElementById(`minPriceInput-${subCategory}`).value);
    const maxPrice = parseInt(document.getElementById(`maxPriceInput-${subCategory}`).value);
    const selectedItems = Array.from(document.querySelectorAll(`#brandList-${subCategory} .brand-checkbox:checked`))
        .map(checkbox => checkbox.value);

    currentFilteredProducts = allProducts.filter(product => 
        product['Sub Categoria'] === subCategory &&
        product.Precio[0] >= minPrice &&
        product.Precio[0] <= maxPrice &&
        product.Stock === "Con Stock" &&
        (selectedItems.length === 0 || (
            subCategory === 'Combos' 
                ? selectedItems.includes(product.Categoria)
                : selectedItems.includes(product.Nombre)
        ))
    );

    currentPage = 1; // Reset to first page when filtering
    displayProducts(currentFilteredProducts);
}



function filterBySubCategory(subCategory) {
    console.log("Filtrando por:", subCategory);
    currentSubCategory = subCategory;
    currentPage = 1;
    currentFilteredProducts = allProducts.filter(product => product['Sub Categoria'] === subCategory);
    console.log("Productos filtrados:", currentFilteredProducts.length);
    displayProducts(currentFilteredProducts);
}

function displayProducts(products) {
    console.log("Mostrando productos:", products.length);

    const productsWithStock = products.filter(product => product.Stock === "Con Stock");
    const startIndex = (currentPage - 1) * productsPerPage;
    const selectedProducts = productsWithStock.slice(startIndex, startIndex + productsPerPage);
    
    const productGrid = document.getElementById('productGrid');
    if (productGrid) {
        productGrid.innerHTML = selectedProducts.map(product => {
            const currentPrice = parseFloat(product.Precio[0]);
            const previousPrice = (currentPrice * 1.15).toFixed(2);
            
            return `
                <div class="product-card bg-white p-2 rounded shadow">
                    <img src="${product.Photo}" alt="${product.Nombre}" class="w-full h-32 object-cover mb-2 cursor-pointer" 
                         onclick="openProductPage('${product.SKU}')" 
                         onerror="handleImageError(this)">
                    <h3 class="text-sm font-semibold mb-1 cursor-pointer h-12 overflow-hidden" onclick="openProductPage('${product.SKU}')">
                        ${capitalizeFirstLetter(product.Categoria)} ${product.Nombre.toUpperCase()} ${product.Modelo} ${product.Tamaño}
                    </h3>
                    <div class="flex justify-between items-center text-sm">
                        <p class="font-bold text-red-600">S/. ${currentPrice.toFixed(2)}</p>
                        <p class="line-through text-gray-500">S/. ${previousPrice}</p>
                    </div>
                    <button onclick="addToCart('${product.SKU}')" class="mt-2 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 w-full text-sm">Añadir</button>
                </div>
            `;
        }).join('');
    }

    updatePagination(productsWithStock.length);
}



function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function getRelatedProducts(currentProduct, count = 5) {
    return allProducts
        .filter(product => 
            product.Categoria === currentProduct.Categoria && 
            product.SKU !== currentProduct.SKU
        )
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
}





function changePage(page, event) {
    if (event) event.preventDefault();
    currentPage = page;
    const products = currentFilteredProducts.length > 0 ? currentFilteredProducts : allProducts;
    displayProducts(products);
    window.scrollTo(0, 0);
}

function searchProducts(query) {
    query = query.toLowerCase();
    return allProducts.filter(product => 
        ['SKU', 'Nombre', 'Modelo', 'Tamaño', 'Categoria'].some(key => 
            String(product[key]).toLowerCase().includes(query)
        )
    );
}



function updatePagination(totalProducts) {
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const pagination = document.getElementById('pagination');
    if (pagination) {
        const range = 5;
        let start = Math.max(1, currentPage - Math.floor(range / 2));
        let end = Math.min(totalPages, start + range - 1);

        if (end - start + 1 < range) {
            start = Math.max(1, end - range + 1);
        }

        let paginationHTML = '<nav class="inline-flex rounded-md shadow">';

        if (start > 1) {
            paginationHTML += `<a href="#" onclick="changePage(1, event)" class="px-4 py-2 bg-white text-blue-600 border border-gray-300 rounded-l-md hover:bg-gray-50">1</a>`;
            if (start > 2) paginationHTML += `<span class="px-4 py-2 bg-white text-gray-600 border border-gray-300">...</span>`;
        }

        for (let i = start; i <= end; i++) {
            paginationHTML += `
                <a href="#" onclick="changePage(${i}, event)" class="px-4 py-2 bg-white text-blue-600 border border-gray-300 ${i === currentPage ? 'bg-blue-100' : ''} hover:bg-gray-50">
                    ${i}
                </a>
            `;
        }

        if (end < totalPages) {
            if (end < totalPages - 1) paginationHTML += `<span class="px-4 py-2 bg-white text-gray-600 border border-gray-300">...</span>`;
            paginationHTML += `<a href="#" onclick="changePage(${totalPages}, event)" class="px-4 py-2 bg-white text-blue-600 border border-gray-300 rounded-r-md hover:bg-gray-50">${totalPages}</a>`;
        }

        paginationHTML += '</nav>';
        
        pagination.innerHTML = paginationHTML;
    }
}

function displaySearchResults(results, isFullPage = false) {
    if (isFullPage) {
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const paginatedResults = results.slice(startIndex, endIndex);

        const productGrid = document.getElementById('productGrid');
        if (productGrid) {
            productGrid.innerHTML = paginatedResults.map(product => `
                <div class="product-card bg-white p-2 rounded shadow">
                    <img src="${product.Photo}" alt="${product.Nombre}" class="w-full h-32 object-cover mb-2 cursor-pointer" 
                         onclick="openProductPage('${product.SKU}')" 
                         onerror="handleImageError(this)">
                    <h3 class="text-sm font-semibold mb-1 cursor-pointer h-12 overflow-hidden" onclick="openProductPage('${product.SKU}')">
                        ${capitalizeFirstLetter(product.Categoria)} ${product.Nombre.toUpperCase()} ${product.Modelo} ${product.Tamaño}
                    </h3>
                    <div class="flex justify-between items-center text-sm">
                        <p class="font-bold text-red-600">S/. ${parseFloat(product.Precio[0]).toFixed(2)}</p>
                        <p class="line-through text-gray-500">S/. ${(parseFloat(product.Precio[0]) * 1.15).toFixed(2)}</p>
                    </div>
                    <button onclick="addToCart('${product.SKU}')" class="mt-2 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 w-full text-sm">Añadir</button>
                </div>
            `).join('');
        }
        updatePagination(results.length);
    } else {
        const searchResults = document.getElementById('searchResults');
        const searchResultsScroll = searchResults.querySelector('.search-results-scroll');
        
        if (results.length === 0) {
            searchResults.classList.add('hidden');
            return;
        }

        searchResultsScroll.innerHTML = results.slice(0, 5).map((product, index) => {
            const currentPrice = parseFloat(product.Precio[0]);
            const previousPrice = (currentPrice * 1.15).toFixed(2);
            
            return `
                <div class="search-result-item flex p-4 hover:bg-gray-100 ${index >= 2 ? 'mobile-hidden' : ''}">
                    <div class="w-1/4 cursor-pointer" onclick="openProductPage('${product.SKU}')">
                        <img src="${product.Photo}" alt="${product.Nombre}" class="w-full h-24 object-contain">
                    </div>
                    <div class="w-3/4 pl-4 flex flex-col justify-between">
                        <div>
                            <h3 class="text-base font-semibold cursor-pointer" style="font-size: 1rem;" onclick="openProductPage('${product.SKU}')">
                                ${product.Nombre} ${product.Modelo}
                            </h3>
                            <p class="text-sm text-gray-600">Tamaño: ${product.Tamaño}</p>
                        </div>
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="text-lg font-bold text-red-600">S/. ${currentPrice.toFixed(2)}</span>
                                <span class="text-sm line-through text-gray-500 ml-2">S/. ${previousPrice}</span>
                            </div>
                            <button onclick="addToCart('${product.SKU}'); event.stopPropagation();" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Añadir</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Añadir el enlace "Ver todos los resultados"
        searchResultsScroll.innerHTML += `
            <div class="p-4 border-t border-gray-200">
                <a href="#" onclick="showAllResults()" class="text-blue-600 hover:text-blue-800 font-semibold">
                    Ver todos los resultados (${results.length})
                </a>
            </div>
        `;

        searchResults.classList.remove('hidden');
        searchResultsScroll.style.maxHeight = '400px';
        searchResultsScroll.style.overflowY = 'auto';

        if (window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
            if (results.length > 2) {
                const thirdItem = searchResultsScroll.querySelector('.search-result-item:nth-child(3)');
                if (thirdItem) {
                    thirdItem.style.height = '58px'; // Muestra solo la mitad del tercer ítem
                }
            }
        }
    }
}



function showAllResults() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    if (query.length > 0) {
        window.location.href = `search-results.html?query=${encodeURIComponent(query)}`;
    }
}

async function initSearchResults() {
    await loadProducts();
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    
    if (query) {
        document.getElementById('searchQuery').textContent = query;
        currentFilteredProducts = searchProducts(query);
        updateFilters(currentFilteredProducts);
        displaySearchResults(currentFilteredProducts, true);
        updateResultCount(currentFilteredProducts.length);
        updatePagination(currentFilteredProducts.length);
    }
}


function updateFilters(results) {
    const categories = [...new Set(results.map(product => product.Categoria))];
    const filtersContainer = document.getElementById('filters');
    
    if (filtersContainer) {
        let filtersHTML = '<h3 class="font-semibold mb-2">Categorías</h3>';
        categories.forEach(category => {
            filtersHTML += `
                <label class="block mb-2">
                    <input type="checkbox" value="${category}" class="mr-2 category-filter"> ${category}
                </label>
            `;
        });
        
        filtersContainer.innerHTML = filtersHTML;
        
        // Añadir event listeners a los checkboxes
        document.querySelectorAll('.category-filter').forEach(checkbox => {
            checkbox.addEventListener('change', applyFilters);
        });
    }
}

function applyFilters() {
    const selectedCategories = [...document.querySelectorAll('.category-filter:checked')].map(cb => cb.value);
    const query = document.getElementById('searchQuery').textContent;
    currentFilteredProducts = searchProducts(query);
    
    if (selectedCategories.length > 0) {
        currentFilteredProducts = currentFilteredProducts.filter(product => selectedCategories.includes(product.Categoria));
    }
    
    currentPage = 1;
    displaySearchResults(currentFilteredProducts, true);
    updateResultCount(currentFilteredProducts.length);
}

function updateResultCount(count) {
    const resultCountElement = document.getElementById('resultCount');
    if (resultCountElement) {
        resultCountElement.textContent = count;
    }
}




function openProductPage(sku) {
    window.location.href = `product.html?sku=${sku}`;
}

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(sku, quantityToAdd = 1) {
    console.log(`Adding to cart. SKU: ${sku}, Quantity: ${quantityToAdd}`);
    const productToAdd = allProducts.find(p => p.SKU === sku);
    if (productToAdd) {
        console.log(`Product to add: ${JSON.stringify(productToAdd)}`);
        const existingItem = cart.find(item => item.SKU === productToAdd.SKU);
        if (existingItem) {
            existingItem.quantity += quantityToAdd;
            console.log(`Updated existing item. New quantity: ${existingItem.quantity}`);
        } else {
            cart.push({ ...productToAdd, quantity: quantityToAdd });
            console.log('Added new item to cart');
        }
        saveCart();
        updateCartDisplay();
        showCart();
    } else {
        console.error('Product not found for adding to cart');
    }
}




function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    
    if (cartItems && cartFooter) {
        cartItems.innerHTML = cart.map(item => {
            const currentPrice = parseFloat(item.Precio[0]);
            const previousPrice = (currentPrice * 1.15);
            const totalCurrentPrice = currentPrice * item.quantity;
            const totalPreviousPrice = previousPrice * item.quantity;
            
            return `
                <div class="flex items-center border-b border-gray-200 py-2">
                    <div class="flex-shrink-0 w-20 h-20 mr-4">
                        <img src="${item.Photo}" alt="${item.Nombre}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-grow">
                        <h3 class="text-sm font-semibold">
                            ${capitalizeFirstLetter(item.Categoria)} ${item.Nombre.toUpperCase()} ${item.Modelo} ${item.Tamaño}
                        </h3>
                        <p class="text-sm text-gray-600">SKU: ${item.SKU}</p>
                        <div class="flex justify-between items-center text-sm mt-1">
                            <p class="font-bold text-red-600">S/. ${totalCurrentPrice.toFixed(2)}</p>
                            <p class="line-through text-gray-500">S/. ${totalPreviousPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    <div class="flex-shrink-0 text-right ml-4">
                        <div class="flex items-center mt-1">
                            <button onclick="updateCartItemQuantity('${item.SKU}', -1)" class="px-2 py-1 bg-gray-200 rounded">-</button>
                            <span class="mx-2">${item.quantity}</span>
                            <button onclick="updateCartItemQuantity('${item.SKU}', 1)" class="px-2 py-1 bg-gray-200 rounded">+</button>
                        </div>
                    </div>
                    <button onclick="removeFromCart('${item.SKU}')" class="ml-4 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        let subtotal = 0;
        let totalDiscount = 0;
        let total = 0;

        cart.forEach(item => {
            const currentPrice = parseFloat(item.Precio[0]);
            const previousPrice = currentPrice * 1.15;
            subtotal += previousPrice * item.quantity;
            totalDiscount += (previousPrice - currentPrice) * item.quantity;
            total += currentPrice * item.quantity;
        });
        
        if (cart.length > 0) {
            cartFooter.innerHTML = `
                <div class="border-t border-gray-200 py-4 mt-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-lg">Subtotal:</span>
                        <span class="text-lg">S/. ${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center mb-2 text-green-600">
                        <span class="text-lg">Descuento:</span>
                        <span class="text-lg">- S/. ${totalDiscount.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center mb-4 font-bold">
                        <span class="text-xl">Total:</span>
                        <span class="text-xl">S/. ${total.toFixed(2)}</span>
                    </div>
                    <button onclick="proceedToCheckout()" class="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600">
                        Solicitar Pedido 
                    </button>
                </div>
            `;
            cartFooter.style.display = 'block';
        } else {
            cartFooter.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-lg">Tu carrito está vacío</p>
                </div>
            `;
            cartFooter.style.display = 'block';
        }
    }

    // Ajustar la posición del cartFooter en dispositivos móviles
    adjustCartFooter();
}


function updateCartItemQuantity(sku, change) {
    const item = cart.find(item => item.SKU === sku);
    if (item) {
        item.quantity = Math.max(1, item.quantity + change);
        saveCart();
        updateCartDisplay();
    }
}

function updateQuantity(sku, change) {
    const item = cart.find(item => item.SKU === sku);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(sku);
        } else {
            saveCart();
            updateCartDisplay();
        }
    }
}

function removeFromCart(sku) {
    cart = cart.filter(item => item.SKU !== sku);
    saveCart();
    updateCartDisplay();
}

function showCart() {
    const shoppingCart = document.getElementById('shoppingCart');
    const cartIcon = document.getElementById('cartIcon');
    if (shoppingCart && cartIcon) {
        console.log('Showing cart');
        shoppingCart.classList.remove('translate-x-full');
        cartIcon.classList.add('hidden');
    } else {
        console.error('Shopping cart or cart icon not found');
    }
}

function hideCart() {
    const shoppingCart = document.getElementById('shoppingCart');
    const cartIcon = document.getElementById('cartIcon');
    if (shoppingCart && cartIcon) {
        console.log('Hiding cart');
        shoppingCart.classList.add('translate-x-full');
        cartIcon.classList.remove('hidden');
    }
} 

function initCartIcon() {
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        console.log('Cart icon found, adding click event listener');
        cartIcon.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            console.log('Cart icon clicked');
            showCart();
        });
    } else {
        console.error('Cart icon not found');
    }
}


function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value;
    if (query.length > 0) {
        const results = searchProducts(query);
        displayProducts(results);
        document.getElementById('searchResults').classList.add('hidden');
    }
}




function openLocationPopup() {
    document.getElementById('locationPopupOverlay').classList.remove('hidden');
    document.getElementById('locationPopup').classList.remove('hidden');
}

function closeLocationPopup() {
    document.getElementById('locationPopupOverlay').classList.add('hidden');
    document.getElementById('locationPopup').classList.add('hidden');
}

// Asegurar que el popup no se cierre cuando se hace clic dentro del iframe
document.getElementById('locationPopup').addEventListener('click', function(event) {
    event.stopPropagation();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.trim().toLowerCase();
            if (query.length > 0) {
                const results = searchProducts(query);
                displaySearchResults(results);
            } else {
                closeSearchResults();
            }
        });

        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                showAllResults();
            }
        });
    }

    if (searchResults) {
        document.addEventListener('click', function(event) {
            if (!searchResults.contains(event.target) && !searchInput.contains(event.target)) {
                closeSearchResults();
            }
        });
    }

    const locationIcon = document.querySelector('.location-icon');
    if (locationIcon) {
        locationIcon.addEventListener('click', openLocationPopup);
    }

    const locationPopupOverlay = document.getElementById('locationPopupOverlay');
    if (locationPopupOverlay) {
        locationPopupOverlay.addEventListener('click', closeLocationPopup);
    }

    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        cartIcon.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            showCart();
        });
    }

    const shoppingCart = document.getElementById('shoppingCart');
    if (shoppingCart) {
        document.addEventListener('click', function(event) {
            if (!shoppingCart.contains(event.target) && 
                !cartIcon.contains(event.target) && 
                !event.target.closest('button') && 
                !event.target.closest('a') && 
                !event.target.closest('input')) {
                hideCart();
            }
        });

        const closeCartButton = shoppingCart.querySelector('.close-button');
        if (closeCartButton) {
            closeCartButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                hideCart();
            });
        }
    }

    // Listener para los filtros en la página de resultados
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    // Listener para el botón "Ver todos los resultados"
    const viewAllResultsButton = document.querySelector('.view-all-results');
    if (viewAllResultsButton) {
        viewAllResultsButton.addEventListener('click', showAllResults);
    }

    // Listeners para la paginación
    const paginationContainer = document.getElementById('pagination');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', function(event) {
            if (event.target.tagName === 'A') {
                event.preventDefault();
                const page = event.target.getAttribute('data-page');
                if (page) {
                    changePage(parseInt(page));
                }
            }
        });
    }

    // Listener para el redimensionamiento de la ventana
    window.addEventListener('resize', function() {
        adjustCartFooter();
        if (window.innerWidth >= 768) {
            document.body.style.overflow = '';
        }
    });
}

function closeSearchResults() {
    const searchResults = document.getElementById('searchResults');
    searchResults.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Restaurar la altura completa del tercer ítem si existe
    const thirdItem = searchResults.querySelector('.search-result-item:nth-child(3)');
    if (thirdItem) {
        thirdItem.style.height = '';
    }
}

function getRelatedProducts(currentProduct, count = 7) {
    console.log('getRelatedProducts called for product:', currentProduct.SKU);
    const relatedProducts = allProducts.filter(product => 
        product.Categoria === currentProduct.Categoria && product.SKU !== currentProduct.SKU
    );
    
    // Mezclar el array de productos relacionados
    for (let i = relatedProducts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [relatedProducts[i], relatedProducts[j]] = [relatedProducts[j], relatedProducts[i]];
    }
    
    const result = relatedProducts.slice(0, count);
    console.log(`Returning ${result.length} related products`);
    return result;
}



function updateSubtotal() {
    console.log('Updating subtotal');
    if (currentProduct) {
        const quantityElement = document.getElementById('quantity');
        const quantity = quantityElement ? parseInt(quantityElement.textContent, 10) : 1;
        console.log(`Current quantity for subtotal: ${quantity}`);
        const subtotal = parseFloat(currentProduct.Precio[0]) * quantity;
        console.log(`Calculated subtotal: ${subtotal}`);
        const addToCartButton = document.querySelector('.add-to-cart');
        if (addToCartButton) {
            addToCartButton.textContent = `Agregar al carrito - S/. ${subtotal.toFixed(2)}`;
            console.log(`Add to cart button text updated: ${addToCartButton.textContent}`);
        } else {
            console.error('Add to cart button not found');
        }
    } else {
        console.error('No current product defined for subtotal update');
    }
}

// Asegúrate de que esta función se llame cuando se carga la página de producto




function initProductPage() {
    console.log('Initializing product page');
    let pageQuantity = 1;

    function updateQuantity(change) {
        console.log(`Updating quantity. Current: ${pageQuantity}, Change: ${change}`);
        pageQuantity = Math.max(1, pageQuantity + change);
        console.log(`New quantity: ${pageQuantity}`);
        const quantityElement = document.getElementById('quantity');
        if (quantityElement) {
            quantityElement.textContent = pageQuantity;
            console.log(`Quantity element updated to: ${pageQuantity}`);
        } else {
            console.error('Quantity element not found');
        }
        updateSubtotal();
    }

    function addToCartFromProductPage(event) {
        console.log('Adding to cart from product page');
        event.preventDefault();
        event.stopPropagation();
        console.log(`Current product: ${JSON.stringify(currentProduct)}`);
        console.log(`Page quantity: ${pageQuantity}`);
        if (currentProduct && currentProduct.SKU) {
            addToCart(currentProduct.SKU, pageQuantity);
            pageQuantity = 1;
            const quantityElement = document.getElementById('quantity');
            if (quantityElement) {
                quantityElement.textContent = pageQuantity;
                console.log('Quantity reset to 1 after adding to cart');
            } else {
                console.error('Quantity element not found when resetting');
            }
            updateSubtotal();
        } else {
            console.error('No valid current product defined');
        }
    }

    // Event listeners específicos de la página de producto
    const decreaseBtn = document.querySelector('.quantity-container button:first-child');
    const increaseBtn = document.querySelector('.quantity-container button:last-child');
    const addToCartBtn = document.querySelector('.add-to-cart');

    if (decreaseBtn && increaseBtn && addToCartBtn) {
        // Remover event listeners existentes
        decreaseBtn.removeEventListener('click', decreaseQuantity);
        increaseBtn.removeEventListener('click', increaseQuantity);
        addToCartBtn.removeEventListener('click', addToCartFromProductPage);

        // Funciones de manejo de eventos
        function decreaseQuantity() {
            console.log('Decrease button clicked');
            updateQuantity(-1);
        }

        function increaseQuantity() {
            console.log('Increase button clicked');
            updateQuantity(1);
        }

        // Agregar nuevos event listeners
        decreaseBtn.addEventListener('click', decreaseQuantity);
        increaseBtn.addEventListener('click', increaseQuantity);
        addToCartBtn.addEventListener('click', addToCartFromProductPage);

        console.log('Event listeners added to quantity buttons and add to cart button');
    } else {
        console.error('One or more buttons not found');
    }

    loadProductDetails();
}



async function init() {
    await loadProducts();
    loadCart();

    const isProductPage = window.location.pathname.includes('product.html');
    const isSearchResultsPage = window.location.pathname.includes('search-results.html');

    if (isProductPage) {
        initProductPage();
    } else if (isSearchResultsPage) {
        initSearchResults();
    } else {
        generateSubCategories(allProducts);
        displayProducts(allProducts);
    }

    adjustCartFooter();
    setupEventListeners();
    updateCartDisplay();
    initCartIcon();
    hideCart();

    // Configuración para el header y scroll
    setupHeaderAndScroll();

    // Inicialización del slider (solo en la página principal)
    if (!isProductPage && !isSearchResultsPage) {
        initSlider();
    }

    // Animación de iconos
    setupIconAnimation('.whatsapp-icon', '#whatsappPath');
    setupIconAnimation('.location-icon', '#locationPath');
}

document.addEventListener('DOMContentLoaded', init);




function setupHeaderAndScroll() {
    const header = document.querySelector('header');
    let isDesktop = window.innerWidth >= 768;
    let lastScrollTop = 0;
    let isTransitioning = false;
    const scrollThreshold = 200;
    const autoScrollThreshold = 50;

    function handleScroll() {
        if (!isDesktop) return;

        const st = window.pageYOffset || document.documentElement.scrollTop;
        
        if (!isTransitioning) {
            if (st > lastScrollTop && st > scrollThreshold) {
                requestAnimationFrame(() => {
                    header.classList.add('shrink');
                    startTransition();
                });
            } else if (st < lastScrollTop && st <= scrollThreshold) {
                requestAnimationFrame(() => {
                    header.classList.remove('shrink');
                    startTransition();
                });

                if (st < autoScrollThreshold) {
                    smoothScrollToTop();
                }
            }
        }
        
        lastScrollTop = st <= 0 ? 0 : st;
    }

    function smoothScrollToTop() {
        const scrollToTop = () => {
            const c = document.documentElement.scrollTop || document.body.scrollTop;
            if (c > 0) {
                window.requestAnimationFrame(scrollToTop);
                window.scrollTo(0, c - c / 8);
            }
        };
        scrollToTop();
    }

    function startTransition() {
        isTransitioning = true;
        setTimeout(() => {
            isTransitioning = false;
        }, 300);
    }

    function checkDeviceWidth() {
        isDesktop = window.innerWidth >= 768;
        if (!isDesktop) {
            header.classList.remove('shrink');
        } else {
            handleScroll();
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkDeviceWidth);
    checkDeviceWidth();
}

function initSlider() {
    const slider = document.querySelector('.slider-container');
    const slides = document.querySelectorAll('.slide');
    const progressBar = document.querySelector('.progress-bar');
    if (slider && slides.length > 0 && progressBar) {
        let currentIndex = 0;
        const slideCount = slides.length;
        const slideDuration = 5000;

        function updateSlider() {
            slider.style.transform = `translateX(-${currentIndex * 100}vw)`;
            const progress = ((currentIndex + 1) / slideCount) * 100;
            progressBar.style.transform = `translateX(${progress - 100}%)`;
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % slideCount;
            updateSlider();
        }

        updateSlider();
        setInterval(nextSlide, slideDuration);
    }
}

function setupIconAnimation(iconSelector, pathSelector) {
    const icon = document.querySelector(iconSelector);
    const path = document.querySelector(pathSelector);
    if (icon && path) {
        icon.addEventListener('mouseenter', function() {
            path.style.animation = 'none';
            setTimeout(() => {
                path.style.animation = 'spiral 0.5s ease-in-out forwards';
            }, 5);
        });
        icon.addEventListener('mouseleave', function() {
            path.style.animation = 'none';
            setTimeout(() => {
                path.style.animation = 'spiral 0.5s ease-in-out reverse forwards';
            }, 5);
        });
    }
}

function generateQuoteCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function saveQuotation(quoteData) {
    try {
        const response = await fetch('save_quotation.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quoteData),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        const responseText = await response.text();
        console.log('Response text:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
        }

        const result = JSON.parse(responseText);
        if (!result.success) {
            throw new Error('Failed to save quotation');
        }

        console.log('Quotation saved successfully');
    } catch (error) {
        console.error('Error saving quotation:', error);
        alert('Hubo un error al guardar la cotización. Por favor, inténtelo de nuevo.');
    }
}

function proceedToCheckout() {
    const phoneNumber = "51938101013";
    const quoteCode = generateQuoteCode();
    let message = `Hola 🥃, requiero los siguientes productos cotizados via Web con el siguiente codigo #${quoteCode}:\n\n`;

    let subtotal = 0;
    let totalDiscount = 0;
    let total = 0;

    cart.forEach(item => {
        const currentPrice = parseFloat(item.Precio[0]);
        const previousPrice = currentPrice * 1.15;
        const itemTotal = currentPrice * item.quantity;
        const itemDiscount = (previousPrice - currentPrice) * item.quantity;
        
        subtotal += previousPrice * item.quantity;
        totalDiscount += itemDiscount;
        total += itemTotal;

        message += `• *${item.Nombre} ${item.Modelo} ${item.Tamaño}* - SKU: ${item.SKU} - ${item.quantity} unidades - S/. ${itemTotal.toFixed(2)}\n`;
    });

    message += `\nSubtotal: S/. ${subtotal.toFixed(2)}`;
    message += `\nDescuento: S/. ${totalDiscount.toFixed(2)}`;
    message += `\nTotal: *S/. ${total.toFixed(2)}*\n\n`;
    message += "Quedo atento(a) a su respuesta.";

    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;

    const quotation = {
        code: quoteCode,
        date: new Date().toISOString(),
        items: cart.map(item => ({
            name: item.Nombre,
            model: item.Modelo,
            size: item.Tamaño,
            sku: item.SKU,
            quantity: item.quantity,
            price: parseFloat(item.Precio[0]),
            originalPrice: parseFloat(item.Precio[0]) * 1.15
        })),
        subtotal: subtotal.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        total: total.toFixed(2)
    };

    saveQuotation(quotation);
    window.open(whatsappLink, '_blank');
}


function hasVisibleNavigationBar() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.clientHeight;
    return windowHeight < documentHeight;
}

function adjustCartFooter() {
    const cartFooter = document.getElementById('cartFooter');
    if (hasVisibleNavigationBar()) {
        cartFooter.style.bottom = '60px'; // Ajustar según la altura de los controles del navegador
    } else {
        cartFooter.style.bottom = '0';
    }
}

// Llamar a esta función en init() y en el evento resize
window.addEventListener('resize', adjustCartFooter);

async function loadProductDetails() {
    console.log('Loading product details');
    const urlParams = new URLSearchParams(window.location.search);
    const sku = urlParams.get('sku');
    if (sku) {
        console.log(`SKU from URL: ${sku}`);
        currentProduct = allProducts.find(p => p.SKU === sku);
        if (currentProduct) {
            console.log(`Product found: ${JSON.stringify(currentProduct)}`);
            document.getElementById('productImage').src = currentProduct.Photo;
            document.getElementById('productCategory').innerHTML = `<a href="index.html">inicio</a> / ${currentProduct.Categoria.toLowerCase()} / ${currentProduct.Nombre.toLowerCase()}`;
            document.getElementById('productName').textContent = `${currentProduct.Nombre} ${currentProduct.Modelo} ${currentProduct.Tamaño}`;
            document.getElementById('productSKU').textContent = `SKU: ${currentProduct.SKU}`;
            
            const currentPrice = parseFloat(currentProduct.Precio[0]);
            const previousPrice = (currentPrice * 1.15).toFixed(2);
            document.getElementById('productPrice').textContent = `S/. ${previousPrice}`;
            document.getElementById('discountPrice').textContent = `S/. ${currentPrice.toFixed(2)}`;
            
            document.getElementById('productDescription').textContent = currentProduct.Descripcion || 'Descripción no disponible';
            updateSubtotal();
            loadRelatedProducts(currentProduct);
        } else {
            console.error(`Product not found for SKU: ${sku}`);
        }
    } else {
        console.error('No SKU provided in URL');
    }
}


function loadRelatedProducts(currentProduct) {
    const relatedProducts = getRelatedProducts(currentProduct, 5);
    const relatedProductsContainer = document.querySelector('.related-products-scroll');
    if (relatedProductsContainer) {
        const relatedProductsHTML = relatedProducts.map(relatedProduct => `
            <div class="product-card bg-white p-2 rounded shadow">
                <div class="product-card-image-container">
                    <img src="${relatedProduct.Photo}" alt="${relatedProduct.Nombre}" class="cursor-pointer" 
                         onclick="openProductPage('${relatedProduct.SKU}')" 
                         onerror="handleImageError(this)">
                </div>
                <h3 class="text-sm font-semibold mb-1 cursor-pointer h-12 overflow-hidden" onclick="openProductPage('${relatedProduct.SKU}')">
                    ${capitalizeFirstLetter(relatedProduct.Categoria)} ${relatedProduct.Nombre.toUpperCase()} ${relatedProduct.Modelo} ${relatedProduct.Tamaño}
                </h3>
                <div class="flex justify-between items-center text-sm">
                    <p class="font-bold text-red-600">S/. ${parseFloat(relatedProduct.Precio[0]).toFixed(2)}</p>
                    <p class="line-through text-gray-500">S/. ${(parseFloat(relatedProduct.Precio[0]) * 1.15).toFixed(2)}</p>
                </div>
                <button onclick="addToCart('${relatedProduct.SKU}')" class="mt-2 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 w-full text-sm">Añadir</button>
            </div>
        `).join('');
        relatedProductsContainer.innerHTML = relatedProductsHTML;

        addScrollIndicator();
    } else {
        console.error('No se encontró el contenedor de productos relacionados');
    }
}

function addScrollIndicator() {
    if (window.innerWidth < 768) {
        const container = document.querySelector('.related-products-container');
        let indicator = document.querySelector('.scroll-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'scroll-indicator';
            indicator.innerHTML = '<span></span><span></span><span></span>';
            container.appendChild(indicator);
        }

        container.addEventListener('scroll', () => {
            const maxScroll = container.scrollWidth - container.clientWidth;
            const currentScroll = container.scrollLeft;
            const scrollPercentage = (currentScroll / maxScroll) * 100;
            indicator.style.setProperty('--scroll', `${scrollPercentage}%`);
        });
    }
}