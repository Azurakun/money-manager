const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction'); // Assuming Transaction.js uses description, amount, type, date
const Debt = require('../models/Debt'); // Import Debt model with the new schema

// --- Transaction Routes (Keep Existing) ---

// Get all transactions
router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ date: -1 }); // Sort by date descending
        res.json(transactions);
    } catch (err) {
        console.error("Error fetching transactions:", err);
        res.status(500).json({ message: "Failed to fetch transactions. " + err.message });
    }
});

// Add a new transaction
router.post('/transactions', async (req, res) => {
    // Basic validation
    if (!req.body.description || req.body.amount == null || !req.body.type) {
        return res.status(400).json({ message: 'Missing required fields: description, amount, type' });
    }
    if (req.body.type !== 'income' && req.body.type !== 'expense') {
        return res.status(400).json({ message: 'Invalid transaction type. Must be "income" or "expense".' });
    }

    const transaction = new Transaction({
        description: req.body.description,
        amount: req.body.amount,
        type: req.body.type,
        date: req.body.date ? new Date(req.body.date) : Date.now() // Ensure date is a Date object
    });

    try {
        const newTransaction = await transaction.save();
        res.status(201).json(newTransaction);
    } catch (err) {
        console.error("Error adding transaction:", err);
        // Provide more specific validation error if available
        if (err.name === 'ValidationError') {
             res.status(400).json({ message: "Transaction validation failed: " + err.message });
        } else {
             res.status(400).json({ message: "Failed to add transaction. " + err.message });
        }
    }
});

// Delete a transaction
router.delete('/transactions/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        await transaction.deleteOne();
        res.json({ message: 'Deleted Transaction' });
    } catch (err) {
         console.error(`Error deleting Transaction ID ${req.params.id}:`, err);
        res.status(500).json({ message: "Failed to delete transaction. " + err.message });
    }
});


// --- Debt Routes ---

// Get all debts
router.get('/debts', async (req, res) => {
    try {
        const debts = await Debt.find().sort({ dueDate: 1 }); // Sort by due date ascending
        res.json(debts);
    } catch (err) {
        console.error("Error fetching debts:", err);
        res.status(500).json({ message: "Failed to fetch debts. " + err.message });
    }
});

/**
 * POST /api/debts
 * Creates a new Debt (using the new schema) and a corresponding expense Transaction.
 * Expects request body with: description, amount, dueDate, [lender], [isPaid]
 */
router.post('/debts', async (req, res) => {
    // 1. Create the Debt object using fields from the request body
    //    matching the NEW Debt.js schema
    const debtData = {
        description: req.body.description,
        amount: req.body.amount, // Now using 'amount'
        lender: req.body.lender,   // Now using 'lender'
        dueDate: req.body.dueDate,
        isPaid: req.body.isPaid === true, // Explicitly handle boolean, default is false via schema
        // dateCreated defaults to Date.now via schema
    };
    const debt = new Debt(debtData);

    let newDebt; // To store the saved debt document

    try {
        // 2. Attempt to save the new Debt. Mongoose validation runs here.
        newDebt = await debt.save();

    } catch (debtSaveErr) {
        console.error("Error saving Debt:", debtSaveErr);
        // This is where the validation error you saw before would likely occur if data is missing/invalid
        return res.status(400).json({
            message: "Failed to save debt. " + debtSaveErr.message,
            error: debtSaveErr.name === 'ValidationError' ? debtSaveErr.errors : debtSaveErr
        });
    }

    // --- If Debt was saved successfully, proceed to create the Transaction ---

    // 3. Create the Transaction object
    //    *** IMPORTANT: Debts are money OWED TO others, so adding a debt means money LEAVES you (expense) ***
    const transactionData = {
        description: `Debt added: ${newDebt.description} (Lender: ${newDebt.lender || 'Unknown'})`,
        amount: -Math.abs(newDebt.amount), // Ensure amount is negative for expense
        type: 'expense',
        date: newDebt.dateCreated // Use the date the debt was created
    };
    const expenseTransaction = new Transaction(transactionData);

    try {
        // 4. Attempt to save the new Transaction.
        await expenseTransaction.save();

        // 5. Both saved successfully! Respond with the created Debt.
        res.status(201).json(newDebt);

    } catch (transactionSaveErr) {
        console.error(`Error saving Transaction for Debt ID ${newDebt._id}:`, transactionSaveErr);
        // Notify client about partial success. Consider rollback?
        return res.status(500).json({
             message: `Debt created successfully (ID: ${newDebt._id}), but failed to create the corresponding expense transaction. Please create it manually.`,
             debt: newDebt,
             transactionError: transactionSaveErr.message
            });
    }
});


// Delete a debt
router.delete('/debts/:id', async (req, res) => {
    try {
        const debt = await Debt.findById(req.params.id);
        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        // Optional: Attempt to find and delete the associated expense transaction created when the debt was added.
        // This requires the description to be consistent. A more robust link (like debtId) is better.
        try {
            const transactionDescription = `Debt added: ${debt.description} (Lender: ${debt.lender || 'Unknown'})`;
            const associatedTransaction = await Transaction.findOneAndDelete({
                description: transactionDescription,
                amount: -Math.abs(debt.amount),
                date: debt.dateCreated // Match based on the original creation date
                // type: 'expense' // Could add this for more specificity
            });
            if (associatedTransaction) {
                console.log(`Deleted associated expense transaction for Debt ID ${debt._id}`);
            } else {
                 console.log(`Could not find associated expense transaction for Debt ID ${debt._id} to delete.`);
            }
        } catch (transactionDeleteErr) {
            console.error(`Error deleting associated transaction for Debt ID ${debt._id}:`, transactionDeleteErr);
            // Decide if this should prevent debt deletion or just be logged.
        }

        await debt.deleteOne();
        res.json({ message: 'Deleted Debt' });
    } catch (err) {
        console.error(`Error deleting Debt ID ${req.params.id}:`, err);
        res.status(500).json({ message: "Failed to delete debt. " + err.message });
    }
});

// Update a debt (e.g., mark as paid)
router.put('/debts/:id', async (req, res) => {
    try {
        const debt = await Debt.findById(req.params.id);
        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        const wasPaid = debt.isPaid; // Store previous state

        // Update fields based on request body
        if (req.body.description != null) {
            debt.description = req.body.description;
        }
        if (req.body.amount != null) {
            debt.amount = req.body.amount;
        }
        if (req.body.lender != null) {
            debt.lender = req.body.lender;
        }
        if (req.body.dueDate != null) {
            debt.dueDate = req.body.dueDate;
        }
         if (req.body.isPaid != null) {
            debt.isPaid = req.body.isPaid;
        }
         // Note: dateCreated is usually not updated

        const updatedDebt = await debt.save(); // This will run validation

        // --- Optional: Logic for when a debt is marked as 'paid' ---
        // If the debt was just marked as paid (was false, now true),
        // consider if you need to create another transaction (maybe not, depends on workflow).
        // If it was marked unpaid after being paid, you might need to adjust transactions.
        if (updatedDebt.isPaid && !wasPaid) {
             console.log(`Debt ID ${updatedDebt._id} marked as paid.`);
             // You ALREADY recorded the expense when the debt was CREATED.
             // Marking it paid doesn't usually mean more money leaves you.
             // If you were tracking money *coming back* (like you lent someone money),
             // then marking 'paid' might trigger an 'income' transaction.
             // Based on your schema ('lender'), this seems to be money you owe.
        } else if (!updatedDebt.isPaid && wasPaid) {
             console.log(`Debt ID ${updatedDebt._id} marked as UNPAID.`);
             // Need to handle this? Maybe delete/revert a 'payment' transaction if one existed?
        }


        // Optional: If fundamental details (amount, date, description) change, update the original expense transaction.
        // This is complex and might be better handled manually or by deleting/recreating.


        res.json(updatedDebt);
    } catch (err) {
         console.error(`Error updating Debt ID ${req.params.id}:`, err);
        if (err.name === 'ValidationError') {
            res.status(400).json({ message: "Failed to update debt. " + err.message, errors: err.errors });
        } else {
            res.status(500).json({ message: "Failed to update debt. " + err.message });
        }
    }
});


module.exports = router;