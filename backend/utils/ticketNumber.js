const VisitorTicket = require('../models/VisitorTicket');

function todayDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// Generates a ticket number like VIS-20261009-001 using a daily counter
// derived from how many tickets already exist for today.
async function nextTicketNumber() {
  const dateStr = todayDateString();
  const prefix = `VIS-${dateStr}-`;
  const countToday = await VisitorTicket.countDocuments({
    ticketNumber: { $regex: `^${prefix}` },
  });
  const sequence = String(countToday + 1).padStart(3, '0');
  return `${prefix}${sequence}`;
}

// 'YYYY-MM-DD' used for VisitorTicket.dateIssued.
function todayISODate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

module.exports = { nextTicketNumber, todayISODate };
