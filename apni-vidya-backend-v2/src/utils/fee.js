// Pure fee-status calculation, extracted so the money math is unit-tested
// independently of the database.
//
// Given the total due and the new cumulative amount paid, returns the record
// status: 'paid' once the full amount is covered, 'partial' for any amount in
// between, and 'pending' when nothing has been paid.
function computeFeeStatus(amountDue, amountPaid) {
  if (amountPaid >= amountDue) return 'paid';
  if (amountPaid <= 0) return 'pending';
  return 'partial';
}

module.exports = { computeFeeStatus };
