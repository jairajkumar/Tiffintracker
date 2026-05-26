// app.js

// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://yamydmkhzthmbjtsnyiq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f8U-fyJMUu0JRr_job4RiA_LrMbKWNf';

// --- 2. GLOBAL STATE ---
let supabaseClient = null;
const state = {
    user: null,
    products: [],
    logs: [],
    calendarDate: new Date(), // Track current calendar month
    currentModalDate: null, // Track which date's modal is open

    // Defaults will be set in init
};

// --- 3. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("App Starting...");

    // A. Initialize Supabase
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("Supabase SDK not found!");
        return;
    }

    // B. Set Default UI Values
    // B. Set Default UI Values
    const dateInput = document.getElementById('log-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    // Default Report Range: First day to Last day of current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0); // 0th day of next month is last day of current

    const startInput = document.getElementById('report-start');
    const endInput = document.getElementById('report-end');

    // Format YYYY-MM-DD (handling local time correctly)
    const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    if (startInput) startInput.value = formatDate(firstDay);
    if (endInput) endInput.value = formatDate(lastDay);

    // C. Attach Event Listeners
    setupEventListeners();

    // D. Check Login Session
    const { data } = await supabaseClient.auth.getSession();

    if (data && data.session) {
        handleSessionSuccess(data.session);
    } else {
        showAuthView();
    }

    // E. Listen for Auth Changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            handleSessionSuccess(session);
        } else if (event === 'SIGNED_OUT') {
            handleSessionLogout();
        }
    });
});

// --- 4. EVENT LISTENERS ---
function setupEventListeners() {
    // Login Form
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault(); // STOPS THE PAGE RELOAD
            handleSignIn();
        });
    }

    // Sign Up Button
    const signUpBtn = document.getElementById('sign-up-btn');
    if (signUpBtn) {
        signUpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleSignUp();
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Add Log Form
    const logForm = document.getElementById('log-form');
    if (logForm) {
        logForm.addEventListener('submit', handleAddLog);
    }

    // Add Product Form
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleAddProduct);
    }

    // Date Range Change
    const reportStart = document.getElementById('report-start');
    const reportEnd = document.getElementById('report-end');

    if (reportStart) reportStart.addEventListener('change', fetchLogs);
    if (reportEnd) reportEnd.addEventListener('change', fetchLogs);

    // Calendar Navigation
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => navigateMonth(1));

    // Modal Close
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalOverlay = document.getElementById('day-modal');

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDayModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeDayModal();
    });
}

// --- 5. AUTH FUNCTIONS ---
async function handleSignIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('auth-error');

    if (errorMsg) errorMsg.classList.add('hidden');

    console.log("Logging in...");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        if (errorMsg) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
        }
        alert("Login Failed: " + error.message);
    } else if (data && data.session) {
        handleSessionSuccess(data.session);
    }
}

async function handleSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        alert("Sign Up Error: " + error.message);
    } else {
        alert("Account created! Please sign in.");
        if (data && data.session) {
            handleSessionSuccess(data.session);
        }
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    handleSessionLogout();
}

function handleSessionSuccess(session) {
    state.user = session.user;

    const emailDisplay = document.getElementById('user-email');
    if (emailDisplay) emailDisplay.textContent = session.user.email;

    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');

    loadDashboardData();
}

function handleSessionLogout() {
    state.user = null;
    state.products = [];
    state.logs = [];

    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
}

// --- 6. DATA FUNCTIONS ---
async function loadDashboardData() {
    await fetchProducts();
    await fetchLogs();
}

async function fetchProducts() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    state.products = data;
    renderProducts();
}

async function handleAddProduct(e) {
    e.preventDefault();
    const nameInput = document.getElementById('new-product-name');
    const priceInput = document.getElementById('new-product-price');

    const name = nameInput.value;
    const price = priceInput.value;

    const { error } = await supabaseClient
        .from('products')
        .insert([{ name, current_price: price }]);

    if (error) {
        alert('Error adding product: ' + error.message);
    } else {
        nameInput.value = '';
        priceInput.value = '';
        fetchProducts();
    }
}

async function fetchLogs() {
    const startDate = document.getElementById('report-start').value;
    const endDate = document.getElementById('report-end').value;

    if (!startDate || !endDate) return;

    const { data, error } = await supabaseClient
        .from('logs')
        .select(`*, products (name)`)
        .gte('log_date', startDate)
        .lte('log_date', endDate) // Inclusive
        .order('log_date', { ascending: false });

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    state.logs = data;
    renderLogs();
    calculateTotal();
}

async function handleAddLog(e) {
    e.preventDefault();
    const date = document.getElementById('log-date').value;
    const productId = document.getElementById('log-product').value;
    const qty = document.getElementById('log-quantity').value;

    if (!productId) {
        alert("Please select a product first.");
        return;
    }

    const product = state.products.find(p => p.id === productId);
    const priceSnapshot = product.current_price;

    const { error } = await supabaseClient
        .from('logs')
        .insert([{
            log_date: date,
            product_id: productId,
            quantity: qty,
            price_snapshot: priceSnapshot
        }]);

    if (error) {
        alert('Error logging entry: ' + error.message);
    } else {
        fetchLogs();
    }
}

window.handleDeleteLog = async function (id) {
    if (!confirm("Delete this entry?")) return;

    const { error } = await supabaseClient
        .from('logs')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting: ' + error.message);
    } else {
        await fetchLogs(); // Refresh calendar and state
        refreshOpenModal(); // Refresh modal content if open
    }
};

window.handleDeleteProduct = async function (id) {
    if (!confirm("Are you sure you want to delete this product? It will be hidden from new logs.")) return;

    const { error } = await supabaseClient
        .from('products')
        .update({ active: false })
        .eq('id', id);

    if (error) {
        alert('Error deleting product: ' + error.message);
    } else {
        fetchProducts();
    }
};

// --- 7. RENDER FUNCTIONS ---
function renderProducts() {
    const select = document.getElementById('log-product');
    const list = document.getElementById('products-list');

    if (!select || !list) return;

    select.innerHTML = '<option value="" disabled selected>Select Product</option>';
    list.innerHTML = '';

    state.products.forEach(p => {
        // Dropdown Option
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} (Rs. ${p.current_price})`;
        select.appendChild(option);

        // Tag with Delete Button
        const tag = document.createElement('div');
        tag.className = 'bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-700 border border-slate-200 flex items-center gap-2';
        tag.innerHTML = `
            <span>${p.name}: Rs. ${p.current_price}</span>
            <button onclick="window.handleDeleteProduct('${p.id}')" class="text-red-400 hover:text-red-600 font-bold ml-1">×</button>
        `;
        list.appendChild(tag);
    });
}

function renderLogs() {
    renderCalendar();
}

function navigateMonth(direction) {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + direction);

    // Update date range inputs to match calendar month
    const firstDay = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1);
    const lastDay = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 0);

    const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const startInput = document.getElementById('report-start');
    const endInput = document.getElementById('report-end');
    if (startInput) startInput.value = formatDate(firstDay);
    if (endInput) endInput.value = formatDate(lastDay);

    fetchLogs();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const titleEl = document.getElementById('calendar-month-title');
    if (!grid) return;

    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();

    // Update title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and total days
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    // Group logs by date
    const logsByDate = {};
    state.logs.forEach(log => {
        if (!logsByDate[log.log_date]) {
            logsByDate[log.log_date] = [];
        }
        logsByDate[log.log_date].push(log);
    });

    // Build calendar grid
    grid.innerHTML = '';

    // Add empty cells for days before first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell other-month';
        grid.appendChild(emptyCell);
    }

    // Add cells for each day of the month
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayLogs = logsByDate[dateStr] || [];

        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        if (dateStr === todayStr) cell.classList.add('today');

        // Make entire cell clickable (even if no items)
        cell.onclick = () => openDayModal(dateStr, dayLogs);

        // Date number
        const dateEl = document.createElement('div');
        dateEl.className = 'calendar-date';
        dateEl.textContent = day;
        cell.appendChild(dateEl);

        // Items container
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'calendar-items';

        // Show up to 2 items, then count
        const maxVisible = 2;
        dayLogs.slice(0, maxVisible).forEach(log => {
            const productName = log.products ? log.products.name : 'Unknown';
            const itemEl = document.createElement('div');
            itemEl.className = 'calendar-item';
            itemEl.textContent = `${productName} x${log.quantity}`;
            itemEl.title = `${productName} - Qty: ${log.quantity} - ₹${(log.quantity * log.price_snapshot).toFixed(2)}`;
            itemsContainer.appendChild(itemEl);
        });

        // Show count if more items
        if (dayLogs.length > maxVisible) {
            const countEl = document.createElement('div');
            countEl.className = 'calendar-item-count';
            countEl.textContent = `+${dayLogs.length - maxVisible} more`;
            itemsContainer.appendChild(countEl);
        }

        cell.appendChild(itemsContainer);

        // Daily total if any logs
        if (dayLogs.length > 0) {
            const dayTotal = dayLogs.reduce((sum, log) => sum + (log.quantity * log.price_snapshot), 0);
            const totalEl = document.createElement('div');
            totalEl.className = 'calendar-total';
            totalEl.textContent = `₹${dayTotal.toFixed(0)}`;
            cell.appendChild(totalEl);
        }

        grid.appendChild(cell);
    }

    // Fill remaining cells to complete the grid
    const totalCells = startDayOfWeek + totalDays;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell other-month';
        grid.appendChild(emptyCell);
    }
}

function calculateTotal() {
    const total = state.logs.reduce((sum, log) => {
        return sum + (log.quantity * log.price_snapshot);
    }, 0);

    const totalEl = document.getElementById('total-bill');
    if (totalEl) totalEl.textContent = `₹${total.toFixed(0)}`;
}

// --- 8. MODAL FUNCTIONS ---
function openDayModal(dateStr, dayLogs) {
    const modal = document.getElementById('day-modal');
    const titleEl = document.getElementById('modal-date-title');
    const listEl = document.getElementById('modal-items-list');
    const totalEl = document.getElementById('modal-day-total');

    if (!modal || !titleEl || !listEl || !totalEl) return;

    // Store current date for refresh
    state.currentModalDate = dateStr;

    // Format date nicely
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    titleEl.textContent = date.toLocaleDateString('en-IN', options);

    // Build items list
    renderModalItems(dayLogs);

    // Populate product dropdown in modal
    populateModalProductDropdown();

    // Reset add form state
    const addForm = document.getElementById('modal-add-form');
    const addToggle = document.getElementById('modal-add-toggle-btn');
    if (addForm) addForm.classList.add('hidden');
    if (addToggle) addToggle.classList.remove('hidden');

    // Show modal
    modal.classList.remove('hidden');
}

function renderModalItems(dayLogs) {
    const listEl = document.getElementById('modal-items-list');
    const totalEl = document.getElementById('modal-day-total');

    if (!listEl || !totalEl) return;

    listEl.innerHTML = '';
    let dayTotal = 0;

    if (dayLogs.length === 0) {
        listEl.innerHTML = '<div class="text-center text-slate-400 py-4">No items for this day</div>';
        totalEl.textContent = 'Day Total: ₹0';
        return;
    }

    dayLogs.forEach(log => {
        const productName = log.products ? log.products.name : 'Unknown';
        const itemTotal = log.quantity * log.price_snapshot;
        dayTotal += itemTotal;

        const itemEl = document.createElement('div');
        itemEl.className = 'modal-item';
        itemEl.innerHTML = `
            <div class="modal-item-info">
                <div class="modal-item-name">${productName}</div>
                <div class="modal-item-details">Qty: ${log.quantity} × ₹${log.price_snapshot}</div>
            </div>
            <div style="display: flex; align-items: center;">
                <div class="modal-item-total">₹${itemTotal.toFixed(0)}</div>
                <button class="modal-item-delete" onclick="window.handleDeleteLog('${log.id}')">×</button>
            </div>
        `;
        listEl.appendChild(itemEl);
    });

    // Update total
    totalEl.textContent = `Day Total: ₹${dayTotal.toFixed(0)}`;
}

function populateModalProductDropdown() {
    const select = document.getElementById('modal-log-product');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Select Item</option>';
    state.products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} (Rs. ${p.current_price})`;
        select.appendChild(option);
    });
}

window.toggleModalAddForm = function () {
    const addForm = document.getElementById('modal-add-form');
    const addToggle = document.getElementById('modal-add-toggle-btn');
    if (addForm && addToggle) {
        addForm.classList.toggle('hidden');
        addToggle.classList.add('hidden');
        // Focus the select
        const select = document.getElementById('modal-log-product');
        if (select) select.focus();
    }
};

window.handleModalAddLog = async function (e) {
    e.preventDefault();

    const productId = document.getElementById('modal-log-product').value;
    const qty = document.getElementById('modal-log-quantity').value;
    const dateStr = state.currentModalDate;

    if (!productId || !dateStr) {
        alert('Please select a product.');
        return;
    }

    const product = state.products.find(p => p.id === productId);
    if (!product) {
        alert('Product not found.');
        return;
    }

    const priceSnapshot = product.current_price;

    const { error } = await supabaseClient
        .from('logs')
        .insert([{
            log_date: dateStr,
            product_id: productId,
            quantity: qty,
            price_snapshot: priceSnapshot
        }]);

    if (error) {
        alert('Error logging entry: ' + error.message);
    } else {
        // Reset the modal form
        document.getElementById('modal-log-product').value = '';
        document.getElementById('modal-log-quantity').value = '1';

        // Refresh data and keep modal open
        await fetchLogs();
        refreshOpenModal();
    }
};

function refreshOpenModal() {
    if (!state.currentModalDate) return;

    // Get updated logs for the current modal date
    const dayLogs = state.logs.filter(log => log.log_date === state.currentModalDate);

    // Always refresh modal content (even if empty)
    renderModalItems(dayLogs);
}

function closeDayModal() {
    const modal = document.getElementById('day-modal');
    if (modal) modal.classList.add('hidden');
    state.currentModalDate = null;
}