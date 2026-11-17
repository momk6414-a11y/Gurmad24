'use strict';
// Add the private visit-record collection without changing existing user data.
module.exports = [
  {
    id: 4,
    name: 'patient-visit-records',
    up(db) {
      if (!Array.isArray(db.visits)) db.visits = [];
      for (const appointment of db.appointments || []) {
        if (appointment.visitConsentAt === undefined) appointment.visitConsentAt = null;
      }
    },
  },
];
