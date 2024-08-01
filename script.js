let allProducts = [];
let currentSubCategory = null;
let currentPage = 1;
const productsPerPage = 30;
let cart = [];
const maxPrice = 500;
let currentFilteredProducts = [];

console.log('Script started');


async function loadProducts() {
    try {
        const response = await fetch('productos.json');
        allProducts = await response.json();
        console.log("Productos cargados:", allProducts.length);
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Error loading products. Please check the console for more details.');
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



function updatePagination(totalProducts) {
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const pagination = document.getElementById('pagination');
    if (pagination) {
        const range = 5;
        let start = Math.max(1, currentPage - range);
        let end = Math.min(totalPages, currentPage + range);

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

function changePage(page, event) {
    event.preventDefault();
    currentPage = page;
    displayProducts(currentFilteredProducts.length > 0 ? currentFilteredProducts : allProducts);
}

function searchProducts(query) {
    query = query.toLowerCase();
    return allProducts.filter(product => 
        ['SKU', 'Nombre', 'Modelo', 'Tamaño', 'Categoria'].some(key => 
            String(product[key]).toLowerCase().includes(query)
        )
    );
}



function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    const searchResultsScroll = searchResults.querySelector('.search-results-scroll');
    
    if (results.length === 0) {
        searchResults.classList.add('hidden');
        return;
    }

    searchResultsScroll.innerHTML = results.map(product => {
        const currentPrice = parseFloat(product.Precio[0]);
        const previousPrice = (currentPrice * 1.15).toFixed(2);
        
        return `
            <div class="flex p-4 hover:bg-gray-100">
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

    searchResults.classList.remove('hidden');
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
    const productToAdd = sku ? allProducts.find(p => p.SKU === sku) : currentProduct;
    if (productToAdd) {
        const existingItem = cart.find(item => item.SKU === productToAdd.SKU);
        if (existingItem) {
            existingItem.quantity += quantityToAdd;
        } else {
            cart.push({ ...productToAdd, quantity: quantityToAdd });
        }
        saveCart();
        updateCartDisplay();
        showCart();
        if (typeof quantity !== 'undefined') {
            quantity = 1;
            if (document.getElementById('quantity')) {
                document.getElementById('quantity').textContent = quantity;
            }
        }
        if (typeof currentProduct !== 'undefined' && typeof updateSubtotal === 'function') {
            updateSubtotal();
        }
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
    }
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

    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (query.length > 0) {
            const results = searchProducts(query);
            displaySearchResults(results);
        } else {
            searchResults.classList.add('hidden');
        }
    });

    document.addEventListener('click', function(event) {
        if (!searchResults.contains(event.target) && !searchInput.contains(event.target)) {
            searchResults.classList.add('hidden');
        }
        if (!document.getElementById('locationPopup').contains(event.target) && !document.querySelector('.location-icon').contains(event.target)) {
            closeLocationPopup();
        }

        const shoppingCart = document.getElementById('shoppingCart');
        const cartIcon = document.getElementById('cartIcon');
        const clickedElement = event.target;

        if (shoppingCart && !shoppingCart.contains(clickedElement) && 
            !cartIcon.contains(clickedElement) && // Agregado para prevenir el cierre cuando se hace clic en el icono
            !clickedElement.closest('button') && 
            !clickedElement.closest('a') && 
            !clickedElement.closest('input')) {
            hideCart();
        }
    });

    const locationPopup = document.getElementById('locationPopup');
    if (locationPopup) {
        locationPopup.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }

    const closeCartButton = document.querySelector('#shoppingCart .close-button');
    if (closeCartButton) {
        closeCartButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            hideCart();
        });
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

async function init() {
    await loadProducts();
    loadCart();
    generateSubCategories(allProducts);
    
    if (!window.location.pathname.includes('product.html')) {
        displayProducts(allProducts);
    }
    
    setupEventListeners();
    updateCartDisplay();
    initCartIcon();
    hideCart();
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    init();

    const whatsappIcon = document.querySelector('.whatsapp-icon');
    const whatsappPath = document.querySelector('#whatsappPath');
    const locationIcon = document.querySelector('.location-icon');
    const locationPath = document.querySelector('#locationPath');

    function setupIconAnimation(icon, path) {
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

    setupIconAnimation(whatsappIcon, whatsappPath);
    setupIconAnimation(locationIcon, locationPath);

    // SLIDER

    const slider = document.querySelector('.slider-container');
    const slides = document.querySelectorAll('.slide');
    const progressBar = document.querySelector('.progress-bar');

    let currentIndex = 0;
    const slideCount = slides.length;
    const slideDuration = 5000; // 5 segundos por slide

    function updateSlider() {
        const slider = document.querySelector('.slider-container');
        if (slider) {
            slider.style.transform = `translateX(-${currentIndex * 100}vw)`;
            updateProgress();
        } else {
            console.log('Slider not found on this page');
        }
    }

    function updateProgress() {
        const progress = ((currentIndex + 1) / slideCount) * 100;
        progressBar.style.transform = `translateX(${progress - 100}%)`;
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % slideCount;
        updateSlider();
    }

    updateSlider();

    // Cambio automático de slide cada 5 segundos
    setInterval(nextSlide, slideDuration);

     // Anmacion header

     let lastScrollTop = 0;
     let isTransitioning = false;
     const header = document.querySelector('header');
     const scrollThreshold = 200;
     
     function handleScroll() {
         const st = window.pageYOffset || document.documentElement.scrollTop;
         
         if (!isTransitioning) {
             if (st > lastScrollTop && st > scrollThreshold) {
                 // Scrolling down
                 requestAnimationFrame(() => {
                     header.classList.add('shrink');
                     startTransition();
                 });
             } else if (st < lastScrollTop && st <= scrollThreshold) {
                 // Scrolling up
                 requestAnimationFrame(() => {
                     header.classList.remove('shrink');
                     startTransition();
                 });
             }
         }
         
         lastScrollTop = st <= 0 ? 0 : st; // For mobile or negative scrolling
     }
     
     function startTransition() {
         isTransitioning = true;
         setTimeout(() => {
             isTransitioning = false;
         }, 300); // This should match your CSS transition duration
     }
     
     window.addEventListener('scroll', handleScroll, { passive: true });
     });

