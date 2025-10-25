const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number, // Always store in base currency (USD)
    required: true
  },
  lender: {
    type: String,
    trim: true,
    default: 'Unknown'
  },
  dueDate: {
    type: Date,
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  dateCreated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Debt', debtSchema);