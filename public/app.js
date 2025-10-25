document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    let allTransactions = [];
    let allDebts = []; // <-- New state for debts
    let allTags = [];
    let currentCurrency = 'IDR';
    let exchangeRates = {
        USD: 1, // Base
        IDR: 16250 // Default, will be updated
    };
    let analyticsChart = null;
    const API_KEY = '46ed31f03c020405ef60027b'; 
    const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

    // --- SELECTORS ---
    // Transaction Modal
    const modal = document.getElementById('add-transaction-modal');
    const modalCard = document.getElementById('modal-card');
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const transactionForm = document.getElementById('transaction-form');
    const currencySelect = document.getElementById('currency-select');
    const modalCurrencyLabel = document.getElementById('modal-currency-label');

    // Debt Modal
    const debtModal = document.getElementById('add-debt-modal');
    const debtModalCard = document.getElementById('debt-modal-card');
    const openDebtModalBtn = document.getElementById('open-debt-modal-btn');
    const closeDebtModalBtn = document.getElementById('close-debt-modal-btn');
    const debtForm = document.getElementById('debt-form');
    const debtModalCurrencyLabel = document.getElementById('debt-modal-currency-label');

    // Views
    const analyticsView = document.getElementById('analytics-view');
    const transactionsView = document.getElementById('transactions-view');
    const debtsView = document.getElementById('debts-view');
    
    // Nav Buttons
    const navButtons = {
        analytics: [document.getElementById('nav-analytics-btn'), document.getElementById('desktop-nav-analytics-btn')],
        list: [document.getElementById('nav-list-btn'), document.getElementById('desktop-nav-list-btn')],
        debt: [document.getElementById('nav-debt-btn'), document.getElementById('desktop-nav-debt-btn')]
    };

    // Transaction List
    const transactionListContainer = document.getElementById('transaction-list-container');
    const noTransactionsMsg = document.getElementById('no-transactions-msg');

    // Debt List
    const debtListContainer = document.getElementById('debt-list-container');
    const noDebtsMsg = document.getElementById('no-debts-msg');

    // Filters
    const filterType = document.getElementById('filter-type');
    const filterTag = document.getElementById('filter-tag');
    const sortBy = document.getElementById('sort-by');
    const sortOrder = document.getElementById('sort-order');

    // Summary
    const summaryIncome = document.getElementById('summary-income');
    const summaryExpense = document.getElementById('summary-expense');
    const summaryBalance = document.getElementById('summary-balance');

    // --- FUNCTIONS ---

    /**
     * Initialize the application
     */
    async function init() {
        // Set default date in forms
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('debt-due-date').valueAsDate = new Date();
        
        await fetchExchangeRates();
        await fetchTags();
        await fetchData();
        
        setupEventListeners();
        
        // Show default view
        showView('analytics');
    }

    /**
     * Fetch latest exchange rates
     */
    async function fetchExchangeRates() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch rates');
            const data = await response.json();
            exchangeRates = data.conversion_rates;
            console.log('Exchange rates loaded.');
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            alert('Could not load currency conversion rates. Using default.');
        }
    }

    /**
     * Fetch all data (transactions, tags, debts) and render
     */
    async function fetchData() {
        await fetchTransactions();
        await fetchDebts();
        renderAll();
    }
    
    /**
     * Fetch all transactions from the API
     */
    async function fetchTransactions() {
        try {
            const query = new URLSearchParams({
                type: filterType.value,
                tag: filterTag.value,
                sortBy: sortBy.value,
                order: sortOrder.value
            }).toString();

            const response = await fetch(`/api/transactions?${query}`);
            if (!response.ok) throw new Error('Failed to fetch');
            
            allTransactions = await response.json();
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    }

    /**
     * Fetch all debts from the API
     */
    async function fetchDebts() {
        try {
            const response = await fetch('/api/debts');
            if (!response.ok) throw new Error('Failed to fetch');
            allDebts = await response.json();
        } catch (error) {
            console.error('Error fetching debts:', error);
        }
    }

    /**
     * Fetch all unique tags
     */
    async function fetchTags() {
        try {
            const response = await fetch('/api/tags');
            if (!response.ok) throw new Error('Failed to fetch');
            allTags = await response.json();
            populateTagFilter();
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    }

    /**
     * Re-render all parts of the UI
     */
    function renderAll() {
        renderTransactionList();
        renderAnalytics();
        renderDebtList();
    }

    /**
     * Render the list of transactions
     */
    function renderTransactionList() {
        transactionListContainer.innerHTML = ''; // Clear list
        
        if (allTransactions.length === 0) {
            noTransactionsMsg.style.display = 'block';
            return;
        }
        
        noTransactionsMsg.style.display = 'none';

        allTransactions.forEach(tx => {
            const card = document.createElement('div');
            card.className = `flex items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-100 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 fade-in`;
            
            const isExpense = tx.type === 'expense';
            const convertedAmount = tx.amount * (exchangeRates[currentCurrency] || 1);
            const formattedAmount = formatCurrency(convertedAmount, currentCurrency);
            const date = new Date(tx.date).toLocaleDateString('en-CA'); // YYYY-MM-DD

            card.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="p-3 rounded-full ${isExpense ? 'bg-red-100' : 'bg-green-100'}">
                        <ion-icon name="${isExpense ? 'arrow-down' : 'arrow-up'}" class="text-2xl ${isExpense ? 'text-red-600' : 'text-green-600'}"></ion-icon>
                    </div>
                    <div>
                        <p class="font-semibold text-lg text-gray-800">${tx.description}</p>
                        <p class="text-sm text-gray-500">${date}</p>
                        <div class="flex flex-wrap gap-2 mt-2">
                            ${tx.tags.map(tag => `<span class="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-lg ${isExpense ? 'text-red-600' : 'text-green-600'}">${isExpense ? '-' : '+'} ${formattedAmount}</p>
                    <button class="delete-btn text-gray-400 hover:text-red-500 transition-colors mt-1" data-id="${tx._id}">
                        <ion-icon name="trash-outline" class="text-lg"></ion-icon>
                    </button>
                </div>
            `;
            
            // Add delete event listener to the button
            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                handleDelete(tx._id);
            });
            
            transactionListContainer.appendChild(card);
        });
    }

    /**
     * Render the list of debts
     */
    function renderDebtList() {
        debtListContainer.innerHTML = ''; // Clear list
        
        if (allDebts.length === 0) {
            noDebtsMsg.style.display = 'block';
            return;
        }
        
        noDebtsMsg.style.display = 'none';

        allDebts.forEach(debt => {
            const card = document.createElement('div');
            const isPaid = debt.isPaid;
            const convertedAmount = debt.amount * (exchangeRates[currentCurrency] || 1);
            const formattedAmount = formatCurrency(convertedAmount, currentCurrency);
            const dueDate = new Date(debt.dueDate).toLocaleDateString('en-CA');
            const isOverdue = new Date(debt.dueDate) < new Date() && !isPaid;

            card.className = `flex items-start justify-between p-5 bg-white rounded-xl shadow-md border border-gray-100 fade-in ${isPaid ? 'opacity-60 bg-gray-50' : ''} ${isOverdue ? 'border-red-300' : ''}`;
            
            card.innerHTML = `
                <div class="flex items-start space-x-4">
                    <input type="checkbox" 
                           class="toggle-debt-btn custom-checkbox mt-1.5 h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all" 
                           data-id="${debt._id}" 
                           ${isPaid ? 'checked' : ''}>
                    <div>
                        <p class="font-semibold text-lg ${isPaid ? 'line-through text-gray-500' : 'text-gray-800'}">${debt.description}</p>
                        <p class="text-sm ${isPaid ? 'line-through text-gray-400' : 'text-gray-500'}">
                            Owed to: <span class="font-medium">${debt.lender}</span>
                        </p>
                        <p class="text-sm font-medium ${isPaid ? 'line-through text-gray-400' : isOverdue ? 'text-red-600' : 'text-gray-500'}">
                            Due: ${dueDate} ${isOverdue ? '(OVERDUE)' : ''}
                        </p>
                    </div>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="font-bold text-lg ${isPaid ? 'line-through text-gray-500' : 'text-blue-700'}">${formattedAmount}</p>
                    <button class="delete-debt-btn text-gray-400 hover:text-red-500 transition-colors mt-1" data-id="${debt._id}">
                        <ion-icon name="trash-outline" class="text-lg"></ion-icon>
                    </button>
                </div>
            `;
            
            card.querySelector('.toggle-debt-btn').addEventListener('click', (e) => {
                handleToggleDebt(e.target.dataset.id);
            });

            card.querySelector('.delete-debt-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteDebt(e.currentTarget.dataset.id);
            });
            
            debtListContainer.appendChild(card);
        });
    }


    /**
     * Render the analytics chart and summary cards
     */
    function renderAnalytics() {
        let totalIncome = 0;
        let totalExpense = 0;

        allTransactions.forEach(tx => {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            } else {
                totalExpense += tx.amount;
            }
        });

        const netBalance = totalIncome - totalExpense;

        // Convert for display
        const displayIncome = totalIncome * (exchangeRates[currentCurrency] || 1);
        const displayExpense = totalExpense * (exchangeRates[currentCurrency] || 1);
        const displayBalance = netBalance * (exchangeRates[currentCurrency] || 1);
        
        // Update summary cards
        summaryIncome.textContent = formatCurrency(displayIncome, currentCurrency);
        summaryExpense.textContent = formatCurrency(displayExpense, currentCurrency);
        summaryBalance.textContent = formatCurrency(displayBalance, currentCurrency);

        // Update Chart
        const ctx = document.getElementById('analytics-chart').getContext('2d');
        
        // Destroy old chart if it exists
        if (analyticsChart) {
            analyticsChart.destroy();
        }

        if (totalIncome === 0 && totalExpense === 0) {
            // Show placeholder
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "16px Arial";
            ctx.fillStyle = "#9ca3af";
            ctx.textAlign = "center";
            ctx.fillText("No data to display. Add a transaction!", ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        analyticsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Income', 'Expense'],
                datasets: [{
                    label: 'Amount',
                    data: [displayIncome, displayExpense],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)', // Green-500
                        'rgba(239, 68, 68, 0.8)'   // Red-500
                    ],
                    borderColor: [
                        '#ffffff',
                        '#ffffff'
                    ],
                    borderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 14,
                                weight: '500'
                            },
                            color: '#374151'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += formatCurrency(context.parsed, currentCurrency);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Format number as currency
     */
    function formatCurrency(amount, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }
    
    /**
     * Add tags to the filter dropdown
     */
    function populateTagFilter() {
        filterTag.innerHTML = '<option value="">All Tags</option>'; // Reset
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
            filterTag.appendChild(option);
        });
    }

    // --- MODAL CONTROLS (Transaction) ---
    function openModal() {
        modal.classList.remove('pointer-events-none');
        modal.classList.add('opacity-100');
        modal.classList.remove('opacity-0');
        
        modalCard.classList.add('opacity-100', 'scale-100');
        modalCard.classList.remove('opacity-0', 'scale-95');
        
        // Reset form
        transactionForm.reset();
        document.getElementById('date').valueAsDate = new Date(); // Set date to today
        modalCurrencyLabel.textContent = currentCurrency;
    }

    function closeModal() {
        modal.classList.add('opacity-0');
        modal.classList.remove('opacity-100');
        modal.classList.add('pointer-events-none');

        modalCard.classList.remove('opacity-100', 'scale-100');
        modalCard.classList.add('opacity-0', 'scale-95');
    }

    // --- MODAL CONTROLS (Debt) ---
    function openDebtModal() {
        debtModal.classList.remove('pointer-events-none');
        debtModal.classList.add('opacity-100');
        debtModal.classList.remove('opacity-0');
        
        debtModalCard.classList.add('opacity-100', 'scale-100');
        debtModalCard.classList.remove('opacity-0', 'scale-95');
        
        // Reset form
        debtForm.reset();
        document.getElementById('debt-due-date').valueAsDate = new Date();
        debtModalCurrencyLabel.textContent = currentCurrency;
    }

    function closeDebtModal() {
        debtModal.classList.add('opacity-0');
        debtModal.classList.remove('opacity-100');
        debtModal.classList.add('pointer-events-none');

        debtModalCard.classList.remove('opacity-100', 'scale-100');
        debtModalCard.classList.add('opacity-0', 'scale-95');
    }


    // --- VIEW CONTROLS ---
    function showView(viewName) {
        // Hide all views
        analyticsView.classList.add('hidden');
        transactionsView.classList.add('hidden');
        debtsView.classList.add('hidden');
        
        // Deactivate all nav buttons
        Object.values(navButtons).flat().forEach(btn => {
            btn.classList.remove('bg-indigo-100', 'text-indigo-600', 'active-nav-btn');
            btn.classList.add('hover:bg-gray-100', 'text-gray-500');
        });

        if (viewName === 'analytics') {
            analyticsView.classList.remove('hidden');
            navButtons.analytics.forEach(btn => {
                btn.classList.add('bg-indigo-100', 'text-indigo-600', 'active-nav-btn');
                btn.classList.remove('hover:bg-gray-100', 'text-gray-500');
            });
        } else if (viewName === 'list') {
            transactionsView.classList.remove('hidden');
            navButtons.list.forEach(btn => {
                btn.classList.add('bg-indigo-100', 'text-indigo-600', 'active-nav-btn');
                btn.classList.remove('hover:bg-gray-100', 'text-gray-500');
            });
        } else if (viewName === 'debt') {
            debtsView.classList.remove('hidden');
            navButtons.debt.forEach(btn => {
                btn.classList.add('bg-indigo-100', 'text-indigo-600', 'active-nav-btn');
                btn.classList.remove('hover:bg-gray-100', 'text-gray-500');
            });
        }
    }


    // --- EVENT HANDLERS ---
    
    /**
     * Handle form submission to add a new transaction
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(transactionForm);
        const data = Object.fromEntries(formData.entries());

        // Convert amount to base currency (USD) before sending
        let baseAmount = parseFloat(data.amount);
        if (currentCurrency !== 'USD') {
            baseAmount = baseAmount / (exchangeRates[currentCurrency] || 1);
        }

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: data.description,
                    amount: baseAmount, // Always store in base currency
                    type: data.type,
                    tags: data.tags,
                    date: data.date
                })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to add transaction');
            }

            // Success
            closeModal();
            await fetchTags(); // Update tags list
            await fetchTransactions(); // Refetch transactions
            renderAll(); // Re-render all (updates analytics)
            showView('list'); // Switch to list view to show the new item
            
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(`Error: ${error.message}`);
        }
    }

    /**
     * Handle form submission to add a new debt
     */
    async function handleDebtSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(debtForm);
        const data = Object.fromEntries(formData.entries());

        // Convert amount to base currency (USD) before sending
        let baseAmount = parseFloat(data.amount);
        if (currentCurrency !== 'USD') {
            baseAmount = baseAmount / (exchangeRates[currentCurrency] || 1);
        }

        try {
            const response = await fetch('/api/debts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: data.description,
                    amount: baseAmount, // Always store in base currency
                    lender: data.lender,
                    dueDate: data.dueDate
                })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to add debt');
            }

            // Success
            closeDebtModal();
            await fetchDebts(); // Refetch debts
            renderDebtList(); // Re-render debt list
            
        } catch (error) {
            console.error('Error submitting debt form:', error);
            alert(`Error: ${error.message}`);
        }
    }
    
    /**
     * Handle deleting a transaction
     */
    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete');
            }
            
            await fetchTags(); // Update tags
            await fetchTransactions(); // Refetch
            renderAll(); // Re-render
            
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Could not delete transaction.');
        }
    }

    /**
     * Handle deleting a debt
     */
    async function handleDeleteDebt(id) {
        if (!confirm('Are you sure you want to delete this debt entry?')) {
            return;
        }

        try {
            const response = await fetch(`/api/debts/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete debt');
            }
            
            await fetchDebts(); // Refetch
            renderDebtList(); // Re-render
            
        } catch (error) {
            console.error('Error deleting debt:', error);
            alert('Could not delete debt.');
        }
    }

    /**
     * Handle toggling a debt's paid status
     */
    async function handleToggleDebt(id) {
        try {
            const response = await fetch(`/api/debts/${id}/toggle`, {
                method: 'PUT'
            });

            if (!response.ok) {
                throw new Error('Failed to update debt');
            }
            
            await fetchDebts(); // Refetch
            renderDebtList(); // Re-render
            
        } catch (error) {
            console.error('Error toggling debt:', error);
            alert('Could not update debt status.');
        }
    }

    /**
     * Handle changes to currency dropdown
     */
    function handleCurrencyChange(e) {
        currentCurrency = e.target.value;
        modalCurrencyLabel.textContent = currentCurrency;
        debtModalCurrencyLabel.textContent = currentCurrency;
        renderAll(); // Re-render everything with new currency
    }

    /**
     * Handle filter/sort changes
     */
    async function handleFilterSortChange() {
        await fetchTransactions();
        renderTransactionList();
        // Note: We don't re-render analytics, as filtering doesn't affect totals
    }
    
    /**
     * Setup all application event listeners
     */
    function setupEventListeners() {
        // Transaction Modal
        openModalBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(); // Close if clicking on bg
        });
        transactionForm.addEventListener('submit', handleFormSubmit);

        // Debt Modal
        openDebtModalBtn.addEventListener('click', openDebtModal);
        closeDebtModalBtn.addEventListener('click', closeDebtModal);
        debtModal.addEventListener('click', (e) => {
            if (e.target === debtModal) closeDebtModal(); // Close if clicking on bg
        });
        debtForm.addEventListener('submit', handleDebtSubmit);
        
        // Currency
        currencySelect.addEventListener('change', handleCurrencyChange);

        // View navigation
        navButtons.analytics.forEach(btn => btn.addEventListener('click', () => showView('analytics')));
        navButtons.list.forEach(btn => btn.addEventListener('click', () => showView('list')));
        navButtons.debt.forEach(btn => btn.addEventListener('click', () => showView('debt')));

        // Filters
        filterType.addEventListener('change', handleFilterSortChange);
        filterTag.addEventListener('change', handleFilterSortChange);
        sortBy.addEventListener('change', handleFilterSortChange);
        sortOrder.addEventListener('change', handleFilterSortChange);
    }

    // --- START ---
    init();
});