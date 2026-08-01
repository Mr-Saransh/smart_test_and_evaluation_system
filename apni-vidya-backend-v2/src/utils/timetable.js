// Pure time helpers for timetable slots, extracted for unit testing.

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Accept "HH:MM" or "HH:MM:SS"; reject anything else so bad input never reaches
// Postgres.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function validTimes(start, end) {
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return false;
  // Lexicographic compare works for zero-padded HH:MM[:SS].
  return start < end;
}

// True if [aStart,aEnd) and [bStart,bEnd) overlap. Times are zero-padded strings.
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

module.exports = { DAY_NAMES, TIME_RE, validTimes, overlaps };
