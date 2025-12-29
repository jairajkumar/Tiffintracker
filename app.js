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
        fetchLogs();
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
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (state.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">No logs for this month.</td></tr>';
        return;
    }

    state.logs.forEach(log => {
        const tr = document.createElement('tr');
        const productName = log.products ? log.products.name : 'Unknown Product';
        const totalRow = (log.quantity * log.price_snapshot).toFixed(2);

        tr.innerHTML = `
            <td class="p-3 text-slate-600">${log.log_date}</td>
            <td class="p-3 font-medium text-slate-800">${productName}</td>
            <td class="p-3 text-center text-slate-600">${log.quantity}</td>
            <td class="p-3 text-right text-slate-500 text-xs">${log.price_snapshot}</td>
            <td class="p-3 text-right font-bold text-slate-700">${totalRow}</td>
            <td class="p-3 text-center">
                <button onclick="window.handleDeleteLog('${log.id}')" class="text-red-400 hover:text-red-600 font-bold text-lg">X</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function calculateTotal() {
    const total = state.logs.reduce((sum, log) => {
        return sum + (log.quantity * log.price_snapshot);
    }, 0);

    const totalEl = document.getElementById('total-bill');
    if (totalEl) totalEl.textContent = `Total: ${total.toFixed(0)}`;
}