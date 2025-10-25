const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Debt = require('../models/Debt'); // <-- Import the new model

// --- GET: Fetch all transactions ---
// Also handles filtering and sorting
router.get('/transactions', async (req, res) => {
  try {
    const { sortBy = 'date', order = 'desc', type, tag } = req.query;

    let filter = {};
    if (type) filter.type = type;
    if (tag) filter.tags = tag;

    const sortOrder = order === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const transactions = await Transaction.find(filter).sort(sort);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- POST: Create a new transaction ---
router.post('/transactions', async (req, res) => {
  const { description, amount, type, tags, date } = req.body;

  // Simple validation
  if (!description || !amount || !type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const newTransaction = new Transaction({
    description,
    amount,
    type,
    tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag), // Split CSV tags
    date: date ? new Date(date) : new Date()
  });

  try {
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- DELETE: Remove a transaction ---
router.delete('/transactions/:id', async (req, res) => {
  try {
    const deletedTransaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!deletedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- GET: Fetch all unique tags ---
router.get('/tags', async (req, res) => {
    try {
        const tags = await Transaction.distinct('tags');
        res.json(tags);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- DEBT ROUTES ---

// --- GET: Fetch all debts ---
router.get('/debts', async (req, res) => {
    try {
        // Sort by due date, soonest first, then unpaid first
        const debts = await Debt.find().sort({ isPaid: 1, dueDate: 1 });
        res.json(debts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- POST: Create a new debt ---
router.post('/debts', async (req, res) => {
    const { description, amount, lender, dueDate } = req.body;

    if (!description || !amount || !dueDate) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const newDebt = new Debt({
        description,
        amount,
        lender: lender || 'Unknown',
        dueDate: new Date(dueDate)
    });

    try {
        const savedDebt = await newDebt.save();
        res.status(201).json(savedDebt);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// --- PUT: Toggle a debt's paid status ---
router.put('/debts/:id/toggle', async (req, res) => {
    try {
        const debt = await Debt.findById(req.params.id);
        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }
        
        debt.isPaid = !debt.isPaid; // Toggle the status
        await debt.save();
        res.json(debt);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- DELETE: Remove a debt ---
router.delete('/debts/:id', async (req, res) => {
    try {
        const deletedDebt = await Debt.findByIdAndDelete(req.params.id);
        if (!deletedDebt) {
            return res.status(404).json({ message: 'Debt not found' });
        }
        res.json({ message: 'Debt deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;